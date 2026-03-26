import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { NextFunction, Request, Response } from "express";

import {
  verifyCustomerToken,
  verifyUserTokenV2,
} from "@oko-wallet-usrd-api/auth";

export interface CustomerAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export interface UserAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function userJwtMiddleware(
  req: UserAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(ErrorCodeMap.UNAUTHORIZED).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "Authorization header with Bearer token required",
    });
    return;
  }

  const token = authHeader.substring(7); // skip "Bearer "

  try {
    const state = req.app.locals as { jwt_secret: string };

    const verifyTokenRes = verifyUserTokenV2({
      token,
      jwt_config: {
        secret: state.jwt_secret,
      },
    });

    if (!verifyTokenRes.success) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: verifyTokenRes.err,
      });
      return;
    }

    const payload = verifyTokenRes.data;

    if (!payload.wallet_id_secp256k1 || !payload.wallet_id_ed25519) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Unauthorized: Invalid token",
      });
      return;
    }

    res.locals.user = {
      email: payload.email,
      wallet_id_secp256k1: payload.wallet_id_secp256k1,
      wallet_id_ed25519: payload.wallet_id_ed25519,
    };

    next();
    return;
  } catch (error) {
    res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}

export async function customerJwtMiddleware(
  req: CustomerAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(ErrorCodeMap.UNAUTHORIZED).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "Authorization header with Bearer token required",
    });
    return;
  }

  const token = authHeader.substring(7); // skip "Bearer "

  try {
    const state = req.app.locals;

    const result = verifyCustomerToken({
      token,
      jwt_config: {
        secret: state.jwt_secret,
      },
    });

    if (!result.success) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: `Token verification failed: ${result.error}`,
      });
      return;
    }

    if (!result.payload) {
      res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Internal server error: Token payload missing after validation",
      });
      return;
    }

    if (
      !result.payload.sub ||
      typeof result.payload.sub !== "string" ||
      result.payload.type !== "customer"
    ) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Invalid token",
      });
      return;
    }

    res.locals.user_id = result.payload.sub;

    next();
    return;
  } catch (error) {
    res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
