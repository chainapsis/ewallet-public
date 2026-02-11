import type { NextFunction, Request, Response } from "express";

import { verifyCustomerToken } from "@oko-wallet-ctd-api/auth";

export interface CustomerAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function customerJwtMiddleware(
  req: CustomerAuthenticatedRequest,
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
    const result = verifyCustomerToken({
      token,
      jwt_config: {
        secret: state.jwt_secret,
      },
    });

    if (!result.success) {
      res
        .status(401)
        .json({ error: `Token verification failed: ${result.error}` });
      return;
    }

    if (!result.payload) {
      res.status(500).json({
        error: "Internal server error: Token payload missing after validation",
      });
      return;
    }

    if (
      !result.payload.sub ||
      typeof result.payload.sub !== "string" ||
      result.payload.type !== "customer"
    ) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    res.locals.user_id = result.payload.sub;

    next();
    return;
  } catch (error) {
    res.status(500).json({
      error: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
