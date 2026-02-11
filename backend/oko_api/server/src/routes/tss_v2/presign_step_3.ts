import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  PresignStep3RequestSchema,
  PresignStep3SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  PresignStep3Body,
  PresignStep3Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runPresignStep3 } from "@oko-wallet-api/api/tss/v1/presign";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

registry.registerPath({
  method: "post",
  path: "/tss/v2/presign/step3",
  tags: ["TSS"],
  summary: "Execute step 3 of presign process",
  description: "Finalizes presign stage",
  security: [{ userAuth: [] }],
  request: {
    headers: UserAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: PresignStep3RequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Presign process completed successfully",
      content: {
        "application/json": {
          schema: PresignStep3SuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request - Session, stage, or result invalid",
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

export async function presignStep3(
  req: UserAuthenticatedRequest<PresignStep3Body>,
  res: Response<OkoApiResponse<PresignStep3Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const runPresignStep3Res = await runPresignStep3(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
    session_id: body.session_id,
    presign_big_r: body.presign_big_r,
  });
  if (runPresignStep3Res.success === false) {
    res
      .status(ErrorCodeMap[runPresignStep3Res.code] ?? 500)
      .json(runPresignStep3Res);

    return;
  }

  sendResponseWithNewToken(res, runPresignStep3Res.data);
}
