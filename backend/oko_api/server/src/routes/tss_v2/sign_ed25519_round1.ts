import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  SignEd25519Round1Body,
  SignEd25519Round1Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runSignEd25519Round1 } from "@oko-wallet-api/api/tss/sign_ed25519";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

registry.registerPath({
  method: "post",
  path: "/tss/v2/sign_ed25519/round1",
  tags: ["TSS"],
  summary: "Generate Ed25519 signing commitments (Round 1)",
  description:
    "Server generates nonces and returns commitments for threshold signing",
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
              msg: { type: "array", items: { type: "number" } },
            },
            required: ["msg"],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully generated commitments",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  commitments_0: {
                    type: "object",
                    properties: {
                      identifier: {
                        type: "array",
                        items: { type: "number" },
                      },
                      commitments: {
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

export async function signEd25519Round1(
  req: UserAuthenticatedRequest<SignEd25519Round1Body>,
  res: Response<OkoApiResponse<SignEd25519Round1Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const apiKey = res.locals.api_key;
  const body = req.body;

  const result = await runSignEd25519Round1(state.db, state.encryption_secret, {
    email: user.email,
    wallet_id: user.wallet_id_ed25519,
    customer_id: apiKey.customer_id,
    msg: body.msg,
  });

  if (result.success === false) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  sendResponseWithNewToken(res, result.data);
}
