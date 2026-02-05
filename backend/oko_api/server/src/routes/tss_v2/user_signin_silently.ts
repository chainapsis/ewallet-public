import type { Request, Response } from "express";
import type { SignInSilentlyResponse } from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  SignInRequestSchema,
  SignInSilentlySuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import { registry } from "@oko-wallet/oko-api-openapi";

import { signInV2 } from "@oko-wallet-api/api/tss/v2/user";
import { verifyUserTokenV2 } from "@oko-wallet-api/api/tss/keplr_auth";

registry.registerPath({
  method: "post",
  path: "/tss/v2/user/signin_silently",
  tags: ["TSS"],
  summary: "Sign in silently with existing V2 token",
  description:
    "Attempts to refresh an expired V2 JWT token or validates an existing one",
  security: [],
  request: {
    headers: UserAuthHeaderSchema,
    body: {
      required: false,
      content: {
        "application/json": {
          schema: SignInRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully processed token",
      content: {
        "application/json": {
          schema: SignInSilentlySuccessResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or missing token",
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

export async function userSignInSilentlyV2(
  req: Request<any, any, { auth_type?: string }>,
  res: Response<OkoApiResponse<SignInSilentlyResponse>>,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: "Authorization header with Bearer token required",
    });
    return;
  }

  const token = authHeader.substring(7); // skip "Bearer "
  const state = req.app.locals;
  // @NOTE: default to google if auth_type is not provided
  const auth_type = (req.body?.auth_type ?? "google") as AuthType;

  const verifyTokenRes = verifyUserTokenV2({
    token,
    jwt_config: {
      secret: state.jwt_secret,
    },
  });

  if (!verifyTokenRes.success) {
    const { err } = verifyTokenRes;

    if (err.type === "expired") {
      const payload = err.payload;

      if (
        !payload.email ||
        !("wallet_id_secp256k1" in payload) ||
        !payload.wallet_id_secp256k1
      ) {
        res.status(401).json({
          success: false,
          code: "INVALID_AUTH_TOKEN",
          msg: "Unauthorized: Invalid token",
        });
        return;
      }

      const signInRes = await signInV2(
        state.db,
        payload.email,
        auth_type,
        {
          secret: state.jwt_secret,
          expires_in: state.jwt_expires_in,
        },
        state.encryption_secret,
        state.logger,
      );

      if (signInRes.success === false) {
        res.status(ErrorCodeMap[signInRes.code] ?? 500).json(signInRes);
        return;
      }

      res.status(200).json({
        success: true,
        data: { token: signInRes.data.token },
      });
      return;
    } else {
      res.status(401).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: verifyTokenRes.err.toString(),
      });
      return;
    }
  } else {
    res.status(200).json({
      success: true,
      data: {
        token: null,
      },
    });
  }
}
