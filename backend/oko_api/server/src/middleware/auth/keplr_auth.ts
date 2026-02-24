import type { Request, Response, NextFunction } from "express";

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
    res
      .status(401)
      .json({ error: "Authorization header with Bearer token required" });
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
      res.status(401).json({ error: verifyTokenRes.err });
      return;
    }

    const payload = verifyTokenRes.data;

    if (!payload.email || !payload.wallet_id) {
      res.status(401).json({
        error: "Unauthorized: Invalid token",
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
    res.status(500).json({
      error: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}

/**
 * Verify a V2 JWT token and set `res.locals.user` with the decoded payload.
 * Shared by `userJwtMiddlewareV2` (header) and `userJwtFromBodyMiddleware` (body).
 */
function verifyJwtV2AndSetLocals(
  token: string,
  req: UserAuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  try {
    const state = req.app.locals;

    const verifyTokenRes = verifyUserTokenV2({
      token,
      jwt_config: {
        secret: state.jwt_secret,
      },
    });

    if (!verifyTokenRes.success) {
      res.status(401).json({ error: verifyTokenRes.err });
      return;
    }

    const payload = verifyTokenRes.data;

    if (
      !payload.email ||
      !payload.wallet_id_secp256k1 ||
      !payload.wallet_id_ed25519
    ) {
      res.status(401).json({
        error: "Unauthorized: Invalid token",
      });
      return;
    }

    res.locals.user = {
      email: payload.email,
      wallet_id_secp256k1: payload.wallet_id_secp256k1,
      wallet_id_ed25519: payload.wallet_id_ed25519,
    };

    next();
  } catch (error) {
    res.status(500).json({
      error: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
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
    res
      .status(401)
      .json({ error: "Authorization header with Bearer token required" });
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
    res
      .status(401)
      .json({ error: "first_login_jwt is required in request body" });
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
