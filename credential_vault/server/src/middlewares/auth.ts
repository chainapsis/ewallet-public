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

    if (!result.success) {
      res.status(401).json({ error: result.err || "Invalid token" });
      return;
    }

    if (!result.data) {
      res.status(500).json({
        error: "Internal server error: Token info missing after validation",
      });
      return;
    }

    if (!result.data.email || !result.data.sub || !result.data.name) {
      res.status(401).json({
        error: "Unauthorized: Invalid token",
      });
      return;
    }

    res.locals.google_user = {
      email: result.data.email,
      name: result.data.name,
      sub: result.data.sub,
    };

    next();
    return;
  } catch (error) {
    res.status(500).json({ error: "Token validation failed" });
    return;
  }
}
