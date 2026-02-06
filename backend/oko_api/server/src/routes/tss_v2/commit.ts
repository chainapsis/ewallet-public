import type { Request, Response } from "express";
import { Bytes } from "@oko-wallet/bytes";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import {
  signMessage,
  convertEddsaSignatureToBytes,
} from "@oko-wallet/crypto-js/node/ecdhe";
import { createCommitRevealSession } from "@oko-wallet/oko-pg-interface/commit_reveal";
import type { ServerState } from "@oko-wallet/oko-api-server-state";

import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CommitRequestBodySchema,
  CommitSuccessResponseSchema,
  type CommitRequestBody,
  type CommitResponseData,
} from "@oko-wallet/oko-api-openapi/tss";

const SESSION_EXPIRY_MINUTES = 5;

registry.registerPath({
  method: "post",
  path: "/tss/v2/commit",
  tags: ["TSS"],
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

export async function commitRevealCommit(
  req: Request<unknown, unknown, CommitRequestBody>,
  res: Response<OkoApiResponse<CommitResponseData>>,
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
    if (createResult.err === "SESSION_ALREADY_EXISTS") {
      return res.status(409).json({
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
  const nodePubkeyHex = state.server_keypair.publicKey.toHex();
  const signResult = signMessage(nodePubkeyHex, state.server_keypair.privateKey);
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
