import { type Request, type Response } from "express";
import { Bytes } from "@oko-wallet/bytes";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";
import {
  signMessage,
  convertEddsaSignatureToBytes,
} from "@oko-wallet/crypto-js/node/ecdhe";
import { createCommitRevealSession } from "@oko-wallet/ksn-pg-interface/commit_reveal";

import { registry } from "@oko-wallet-ksn-server/openapi/doc";
import {
  CommitRequestBodySchema,
  CommitSuccessResponseSchema,
  ErrorResponseSchema,
  type CommitRequestBody,
  type CommitResponseData,
} from "@oko-wallet-ksn-server/openapi/schema";
import { ErrorCodeMap } from "@oko-wallet-ksn-server/error";
import type { ServerState } from "@oko-wallet-ksn-server/state";

const SESSION_EXPIRY_MINUTES = 5;

registry.registerPath({
  method: "post",
  path: "/keyshare/v2/commit",
  tags: ["Commit-Reveal"],
  summary: "Create a commit-reveal session",
  description:
    "Creates a new commit-reveal session for frontrunning prevention. Returns node's public key and signature.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CommitRequestBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully created session",
      content: {
        "application/json": {
          schema: CommitSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - invalid input",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
            INVALID_REQUEST: {
              value: {
                success: false,
                code: "INVALID_REQUEST",
                msg: "Invalid client_ephemeral_pubkey format",
              },
            },
          },
        },
      },
    },
    409: {
      description: "Conflict - session already exists",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
            SESSION_ALREADY_EXISTS: {
              value: {
                success: false,
                code: "SESSION_ALREADY_EXISTS",
                msg: "Session with this id_token_hash already exists",
              },
            },
          },
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export async function commit(
  req: Request<unknown, unknown, CommitRequestBody>,
  res: Response<KSNodeApiResponse<CommitResponseData>>,
) {
  const state = req.app.locals as ServerState;
  const body = req.body;

  // Validate client_ephemeral_pubkey (32 bytes hex)
  const clientPubkeyRes = Bytes.fromHexString(body.client_ephemeral_pubkey, 32);
  if (!clientPubkeyRes.success) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: `Invalid client_ephemeral_pubkey: ${clientPubkeyRes.err}`,
    });
  }

  // Validate id_token_hash (32 bytes hex)
  const idTokenHashRes = Bytes.fromHexString(body.id_token_hash, 32);
  if (!idTokenHashRes.success) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: `Invalid id_token_hash: ${idTokenHashRes.err}`,
    });
  }

  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000);

  const createResult = await createCommitRevealSession(state.db, {
    session_id: body.session_id,
    operation_type: body.operation_type,
    client_ephemeral_pubkey: clientPubkeyRes.data.toUint8Array(),
    id_token_hash: body.id_token_hash,
    expires_at: expiresAt,
  });

  if (!createResult.success) {
    // Check for duplicate key errors
    if (createResult.err.includes("duplicate key")) {
      return res.status(ErrorCodeMap.SESSION_ALREADY_EXISTS).json({
        success: false,
        code: "SESSION_ALREADY_EXISTS",
        msg: "Session with this session_id, client_ephemeral_pubkey, or id_token_hash already exists",
      });
    }
    return res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to create session: ${createResult.err}`,
    });
  }

  // Sign the node's public key with the node's private key
  const nodePubkeyHex = state.serverKeypair.publicKey.toHex();
  const signResult = signMessage(nodePubkeyHex, state.serverKeypair.privateKey);
  if (!signResult.success) {
    return res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to sign node public key: ${signResult.err}`,
    });
  }

  const signatureBytesRes = convertEddsaSignatureToBytes(signResult.data);
  if (!signatureBytesRes.success) {
    return res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to convert signature: ${signatureBytesRes.err}`,
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      node_pubkey: nodePubkeyHex,
      node_signature: signatureBytesRes.data.toHex(),
    },
  });
}
