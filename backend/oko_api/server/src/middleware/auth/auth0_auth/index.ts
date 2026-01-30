import type { Request, Response, NextFunction } from "express";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { validateAuth0IdToken } from "@oko-wallet-api/middleware/auth/auth0_auth/validate";
import {
  AUTH0_CLIENT_ID,
  AUTH0_DOMAIN,
} from "@oko-wallet-api/middleware/auth/auth0_auth/client_id";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

export interface Auth0AuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function auth0AuthMiddleware(
  req: Auth0AuthenticatedRequest,
  res: Response<unknown, OAuthLocals>,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Authorization header with Bearer token required" });
    return;
  }

  const idToken = authHeader.substring(7).trim();

  try {
    const result = await validateAuth0IdToken({
      idToken,
      clientId: AUTH0_CLIENT_ID,
      domain: AUTH0_DOMAIN,
    });

    if (!result.success) {
      res.status(401).json({ error: result.err });
      return;
    }

    if (!result.data) {
      res.status(500).json({
        error: "Internal server error: Token info missing after validation",
      });
      return;
    }

    if (!result.data.email || !result.data.sub) {
      res.status(401).json({
        error: "Unauthorized: Invalid token",
      });
      return;
    }

    res.locals.oauth_user = {
      type: "auth0" as AuthType,
      // in auth0, use email as identifier
      user_identifier: result.data.email,
      email: result.data.email,
      metadata: result.data as unknown as Record<string, unknown>,
    };

    next();
    return;
  } catch (error) {
    res.status(500).json({
      error: `Auth0 token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
