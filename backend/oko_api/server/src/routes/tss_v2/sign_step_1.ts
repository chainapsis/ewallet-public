import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  SignStep1RequestSchema,
  SignStep1SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  SignStep1Body,
  SignStep1Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runSignStep1 } from "@oko-wallet-api/api/tss/v1/sign";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

registry.registerPath({
  method: "post",
  path: "/tss/v2/sign/step1",
  tags: ["TSS"],
  summary: "Initiate signing process using completed presign",
  description: "Creates sign stage and generates initial sign messages",
  security: [{ userAuth: [] }],
  request: {
    headers: UserAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SignStep1RequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully initialized signing process",
      content: {
        "application/json": {
          schema: SignStep1SuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request - Session or stage validation failed",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or missing JWT token",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
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

export async function signStep1(
  req: UserAuthenticatedRequest<SignStep1Body>,
  res: Response<OkoApiResponse<SignStep1Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const runSignStep1Res = await runSignStep1(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
    session_id: body.session_id,
    msg: body.msg,
    msgs_1: body.msgs_1,
  });
  if (runSignStep1Res.success === false) {
    res.status(ErrorCodeMap[runSignStep1Res.code] ?? 500).json(runSignStep1Res);

    return;
  }

  sendResponseWithNewToken(res, runSignStep1Res.data);
}
