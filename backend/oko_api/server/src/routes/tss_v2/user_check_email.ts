import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CheckEmailRequestSchema,
  CheckEmailSuccessResponseV2Schema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type {
  CheckEmailRequest,
  CheckEmailResponseV2,
} from "@oko-wallet/oko-types/user";
import type { Request, Response } from "express";

import { checkEmailV2 } from "@oko-wallet-api/api/tss/v2/user";

registry.registerPath({
  method: "post",
  path: "/tss/v2/user/check",
  tags: ["TSS"],
  summary: "Check if email exists",
  description:
    "Checks if a user with the given email address exists in the database",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CheckEmailRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully checked email existence",
      content: {
        "application/json": {
          schema: CheckEmailSuccessResponseV2Schema,
        },
      },
    },
    400: {
      description: "Invalid request - Email is missing",
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

export async function userCheckEmailV2(
  req: Request<any, any, CheckEmailRequest>,
  res: Response<OkoApiResponse<CheckEmailResponseV2>>,
) {
  const state = req.app.locals;

  const { email } = req.body;
  // @NOTE: default to google if auth_type is not provided
  const auth_type = (req.body.auth_type ?? "google") as AuthType;

  if (!email) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: "email is required",
    });
    return;
  }

  const checkEmailRes = await checkEmailV2(state.db, email, auth_type);
  if (checkEmailRes.success === false) {
    res
      .status(ErrorCodeMap[checkEmailRes.code] ?? 500) //
      .json(checkEmailRes);
    return;
  }

  res.status(200).json({
    success: true,
    data: checkEmailRes.data,
  });
}
