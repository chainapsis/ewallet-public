import type { Request, Response, NextFunction } from "express";
import { Bytes } from "@oko-wallet/bytes";
import { verifySignature } from "@oko-wallet/crypto-js/node/ecdhe";
import { sha256, buildRevealMessage } from "@oko-wallet/crypto-js";
import {
  getCommitRevealSessionBySessionId,
  createCommitRevealApiCall,
  updateCommitRevealSessionState,
  hasCommitRevealApiBeenCalled,
} from "@oko-wallet/oko-pg-interface/commit_reveal";
import type { ApiName } from "@oko-wallet/oko-types/commit_reveal";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";

import { isApiAllowed, isFinalApi } from "@oko-wallet-api/commit_reveal";
import type { ServerState } from "@oko-wallet/oko-api-server-state";

const DEFAULT_AUTH_TYPE = "google";

export interface CommitRevealBody {
  cr_session_id: string;
  cr_signature: string; // 128 chars hex (64 bytes)
  cr_final?: boolean;
  auth_type?: string;
}

export function commitRevealMiddleware(apiName: ApiName) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const state = req.app.locals as ServerState;
    const body = req.body as CommitRevealBody;
    const { cr_session_id, cr_signature } = body;

    if (!cr_session_id || !cr_signature) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "cr_session_id and cr_signature are required",
      });
      return;
    }

    const sessionResult = await getCommitRevealSessionBySessionId(
      state.db,
      cr_session_id,
    );
    if (!sessionResult.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get session: ${sessionResult.err}`,
      });
      return;
    }

    const session = sessionResult.data;
    if (!session) {
      res.status(ErrorCodeMap.SESSION_NOT_FOUND).json({
        success: false,
        code: "SESSION_NOT_FOUND",
        msg: "Session not found",
      });
      return;
    }

    if (session.state !== "COMMITTED") {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: `Session is not in COMMITTED state: ${session.state}`,
      });
      return;
    }

    if (new Date() > session.expires_at) {
      res.status(ErrorCodeMap.SESSION_EXPIRED).json({
        success: false,
        code: "SESSION_EXPIRED",
        msg: "Session has expired",
      });
      return;
    }

    if (!isApiAllowed(session.operation_type, apiName)) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: `API "${apiName}" is not allowed for operation "${session.operation_type}"`,
      });
      return;
    }

    // Check if this API has already been called for this session (replay attack prevention)
    const apiCalledResult = await hasCommitRevealApiBeenCalled(
      state.db,
      cr_session_id,
      apiName,
    );
    if (!apiCalledResult.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to check API call status: ${apiCalledResult.err}`,
      });
      return;
    }
    if (apiCalledResult.data) {
      res.status(ErrorCodeMap.API_ALREADY_CALLED).json({
        success: false,
        code: "API_ALREADY_CALLED",
        msg: `API "${apiName}" has already been called for this session`,
      });
      return;
    }

    const signatureRes = Bytes.fromHexString(cr_signature, 64);
    if (!signatureRes.success) {
      res.status(ErrorCodeMap.INVALID_SIGNATURE).json({
        success: false,
        code: "INVALID_SIGNATURE",
        msg: `Invalid signature format: ${signatureRes.err}`,
      });
      return;
    }

    const clientPubkeyRes = Bytes.fromUint8Array(
      session.client_ephemeral_pubkey,
      32,
    );
    if (!clientPubkeyRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to parse client pubkey: ${clientPubkeyRes.err}`,
      });
      return;
    }

    // Get auth_type and id_token from request
    const authType = body.auth_type ?? DEFAULT_AUTH_TYPE;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        msg: "Authorization header with Bearer token required",
      });
      return;
    }
    const idToken = authHeader.substring(7).trim();

    // Verify id_token_hash matches committed hash
    const computedHashRes = sha256(`${authType}${idToken}`);
    if (!computedHashRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to compute id_token_hash: ${computedHashRes.err}`,
      });
      return;
    }
    const computedHash = computedHashRes.data.toHex();
    if (computedHash !== session.id_token_hash) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "id_token_hash mismatch: token does not match committed session",
      });
      return;
    }

    // Verify signature: message = node_pubkey + session_id + auth_type + id_token + operation_type + api_name
    const nodePubkeyHex = state.server_keypair.publicKey.toHex();
    const message = buildRevealMessage({
      nodePubkeyHex,
      sessionId: cr_session_id,
      authType,
      idToken,
      operationType: session.operation_type,
      apiName,
    });
    const rBytes = Bytes.fromUint8Array(
      signatureRes.data.toUint8Array().slice(0, 32),
      32,
    );
    const sBytes = Bytes.fromUint8Array(
      signatureRes.data.toUint8Array().slice(32, 64),
      32,
    );
    if (!rBytes.success || !sBytes.success) {
      res.status(ErrorCodeMap.INVALID_SIGNATURE).json({
        success: false,
        code: "INVALID_SIGNATURE",
        msg: "Failed to parse signature components",
      });
      return;
    }

    const verifyResult = verifySignature(
      message,
      { r: rBytes.data, s: sBytes.data },
      clientPubkeyRes.data,
    );
    if (!verifyResult.success) {
      res.status(ErrorCodeMap.INVALID_SIGNATURE).json({
        success: false,
        code: "INVALID_SIGNATURE",
        msg: `Signature verification failed: ${verifyResult.err}`,
      });
      return;
    }
    if (!verifyResult.data) {
      res.status(ErrorCodeMap.INVALID_SIGNATURE).json({
        success: false,
        code: "INVALID_SIGNATURE",
        msg: "Invalid signature",
      });
      return;
    }

    res.locals.cr_session_id = cr_session_id;

    // Record API call and update session state on successful response
    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const client = await state.db.connect();
        try {
          await client.query("BEGIN");

          await createCommitRevealApiCall(
            client,
            cr_session_id,
            apiName,
            signatureRes.data.toUint8Array(),
          );

          if (isFinalApi(session.operation_type, apiName)) {
            await updateCommitRevealSessionState(
              client,
              cr_session_id,
              "COMPLETED",
            );
          }

          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          state.logger.error(
            "Failed to record API call for session %s: %s",
            cr_session_id,
            err,
          );
        } finally {
          client.release();
        }
      }
    });

    next();
  };
}
