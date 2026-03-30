import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { NextFunction, Request, Response } from "express";

import {
  verifyUserToken,
  verifyUserTokenV2,
} from "@oko-wallet-api/api/tss/keplr_auth";

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
    const state = req.app.locals;

    const verifyTokenRes = verifyUserToken({
      token,
      jwt_config: {
        secret: state.jwt_secret,
      },
    });

    if (!verifyTokenRes.success) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: verifyTokenRes.err.msg,
      });
      return;
    }

    const payload = verifyTokenRes.data;

    if (!payload.email || !payload.wallet_id) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Unauthorized: Invalid token",
      });
      return;
    }

    res.locals.user = {
      email: payload.email,
      wallet_id: payload.wallet_id,
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

/**
 * Verify a V2 (or V1) JWT token and set `res.locals.user` with the decoded payload.
 * Shared by `userJwtMiddlewareV2` (header) and `userJwtFromBodyMiddleware` (body).
 *
 * Supports V1 token fallback: if the token contains `wallet_id` (V1) instead of
 * `wallet_id_secp256k1` (V2), it maps `wallet_id` → `wallet_id_secp256k1` and
 * leaves `wallet_id_ed25519` as `null`. This allows V1 users to use secp256k1
 * signing through V2 endpoints.
 */
function verifyJwtV2AndSetLocals(
  token: string,
  req: UserAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  try {
    const state = req.app.locals;
    const jwtConfig = { secret: state.jwt_secret };

    // Try V2 token first
    const v2Result = verifyUserTokenV2({ token, jwt_config: jwtConfig });

    if (v2Result.success) {
      const payload = v2Result.data;

      if (!payload.email || !payload.wallet_id_secp256k1) {
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
        wallet_id_ed25519: payload.wallet_id_ed25519 || null,
      };

      next();
      return;
    }

    // Fallback: try V1 token (has `wallet_id` instead of `wallet_id_secp256k1`)
    const v1Result = verifyUserToken({ token, jwt_config: jwtConfig });

    if (v1Result.success) {
      const payload = v1Result.data;

      if (!payload.email || !payload.wallet_id) {
        res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
          success: false,
          code: "INVALID_AUTH_TOKEN",
          msg: "Unauthorized: Invalid token",
        });
        return;
      }

      res.locals.user = {
        email: payload.email,
        wallet_id_secp256k1: payload.wallet_id,
        wallet_id_ed25519: null,
      };

      next();
      return;
    }

    res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
      success: false,
      code: "INVALID_AUTH_TOKEN",
      msg: v2Result.err.msg,
    });
  } catch (error) {
    res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function userJwtMiddlewareV2(
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
  verifyJwtV2AndSetLocals(token, req, res, next);
}

/**
 * JWT middleware that reads the token from `body.first_login_jwt` instead of
 * the Authorization header. Used by export_shares endpoint.
 */
export async function userJwtFromBodyMiddleware(
  req: UserAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const firstLoginJwt = req.body?.first_login_jwt;

  if (!firstLoginJwt || typeof firstLoginJwt !== "string") {
    res.status(ErrorCodeMap.UNAUTHORIZED).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "first_login_jwt is required in request body",
    });
    return;
  }

  verifyJwtV2AndSetLocals(firstLoginJwt, req, res, next);
}

export function sendResponseWithNewToken(
  res: Response,
  data: any,
  statusCode: number = 200,
) {
  if (res.locals.newToken) {
    res.setHeader("X-New-Token", res.locals.newToken);
  }
  res.status(statusCode).json({ success: true, data });
}
