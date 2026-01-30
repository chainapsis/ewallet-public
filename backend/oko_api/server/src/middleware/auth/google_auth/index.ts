import type { Request, Response, NextFunction } from "express";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { validateOAuthToken } from "@oko-wallet-api/middleware/auth/google_auth/validate";
import { GOOGLE_CLIENT_ID } from "@oko-wallet-api/middleware/auth/google_auth/client_id";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

export interface GoogleAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function googleAuthMiddleware(
  req: GoogleAuthenticatedRequest,
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

  const idToken = authHeader.substring(7); // skip "Bearer "

  try {
    const result = await validateOAuthToken(idToken, GOOGLE_CLIENT_ID);

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

    if (!result.data.sub || !result.data.email) {
      res.status(401).json({
        error: "Can't get sub or email from Google token",
      });
      return;
    }

    res.locals.oauth_user = {
      type: "google" as AuthType,
      // in google, use google sub as identifier with prefix
      user_identifier: `google_${result.data.sub}`,
      email: result.data.email,
      metadata: result.data as unknown as Record<string, unknown>,
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
