import type { Request, Response, NextFunction } from "express";

import { validateOAuthToken } from "../auth";

export interface AuthenticatedRequest<T = any> extends Request {
  user?: {
    email: string;
    name: string;
    sub: string;
  };
  body: T;
}

export async function bearerTokenMiddleware(
  req: AuthenticatedRequest,
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

  const idToken = authHeader.substring(7); // skip "Bearer "

  try {
    const result = await validateOAuthToken(idToken);

    if (!result.isValid) {
      res.status(401).json({ error: result.error || "Invalid token" });
      return;
    }

    if (!result.tokenInfo) {
      res.status(500).json({
        error: "Internal server error: Token info missing after validation",
      });
      return;
    }

    req.user = {
      email: result.tokenInfo.email,
      name: result.tokenInfo.name,
      sub: result.tokenInfo.sub,
    };

    next();
    return;
  } catch (error) {
    res.status(500).json({ error: "Token validation failed" });
    return;
  }
}
