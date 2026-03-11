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
import {
  generateUserTokenV2,
  verifyUserToken,
  verifyUserTokenV2,
} from "@oko-wallet-api/api/tss/keplr_auth";

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

  const jwtConfig = { secret: state.jwt_secret };

  // Try V2 token first
  const v2Result = verifyUserTokenV2({ token, jwt_config: jwtConfig });

  if (v2Result.success) {
    // V2 token is still valid
    res.status(200).json({ success: true, data: { token: null } });
    return;
  }

  if (v2Result.err.type === "expired") {
    const payload = v2Result.err.payload;

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
  }

  // V2 verify failed (not expired) — try V1 token fallback
  const v1Result = verifyUserToken({ token, jwt_config: jwtConfig });

  if (v1Result.success) {
    const payload = v1Result.data;

    if (!payload.email || !payload.wallet_id) {
      res.status(401).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Unauthorized: Invalid token",
      });
      return;
    }

    // Issue a V2 token with secp256k1 only (no ed25519)
    const tokenResult = generateUserTokenV2({
      wallet_id_secp256k1: payload.wallet_id,
      wallet_id_ed25519: "",
      email: payload.email,
      jwt_config: {
        secret: state.jwt_secret,
        expires_in: state.jwt_expires_in,
      },
    });

    if (tokenResult.success === false) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to generate token",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { token: tokenResult.data.token },
    });
    return;
  }

  if (v1Result.err.type === "expired") {
    const payload = v1Result.err.payload;

    if (!payload.email || !("wallet_id" in payload) || !payload.wallet_id) {
      res.status(401).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Unauthorized: Invalid token",
      });
      return;
    }

    // Issue a V2 token with secp256k1 only (no ed25519)
    const tokenResult = generateUserTokenV2({
      wallet_id_secp256k1: payload.wallet_id,
      wallet_id_ed25519: "",
      email: payload.email,
      jwt_config: {
        secret: state.jwt_secret,
        expires_in: state.jwt_expires_in,
      },
    });

    if (tokenResult.success === false) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to generate token",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { token: tokenResult.data.token },
    });
    return;
  }

  res.status(401).json({
    success: false,
    code: "INVALID_REQUEST",
    msg: v1Result.err.toString(),
  });
}
