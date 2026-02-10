import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  SignEd25519Round2Body,
  SignEd25519Round2Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runSignEd25519Round2 } from "@oko-wallet-api/api/tss/sign_ed25519";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

registry.registerPath({
  method: "post",
  path: "/tss/v2/sign_ed25519/round2",
  tags: ["TSS"],
  summary: "Generate Ed25519 signature share (Round 2)",
  description: "Server generates signature share using collected commitments",
  security: [{ userAuth: [] }],
  request: {
    headers: UserAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              session_id: { type: "string" },
              commitments_1: {
                type: "object",
                properties: {
                  identifier: { type: "array", items: { type: "number" } },
                  commitments: { type: "array", items: { type: "number" } },
                },
              },
            },
            required: ["session_id", "commitments_1"],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully generated signature share",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  signature_share_0: {
                    type: "object",
                    properties: {
                      identifier: {
                        type: "array",
                        items: { type: "number" },
                      },
                      signature_share: {
                        type: "array",
                        items: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export async function signEd25519Round2(
  req: UserAuthenticatedRequest<SignEd25519Round2Body>,
  res: Response<OkoApiResponse<SignEd25519Round2Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const result = await runSignEd25519Round2(state.db, state.encryption_secret, {
    email: user.email,
    wallet_id: user.wallet_id_ed25519,
    session_id: body.session_id,
    commitments_1: body.commitments_1,
  });

  if (result.success === false) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  sendResponseWithNewToken(res, result.data);
}
