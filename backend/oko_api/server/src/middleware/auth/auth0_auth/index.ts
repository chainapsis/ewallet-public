import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { NextFunction, Request, Response } from "express";

import { validateAuth0IdToken } from "@oko-wallet-api/middleware/auth/auth0_auth/validate";
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
    res.status(ErrorCodeMap.UNAUTHORIZED).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "Authorization header with Bearer token required",
    });
    return;
  }

  const idToken = authHeader.substring(7).trim();

  try {
    const result = await validateAuth0IdToken({
      idToken,
    });

    if (!result.success) {
      res
        .status(ErrorCodeMap.INVALID_AUTH_TOKEN)
        .json({ success: false, code: "INVALID_AUTH_TOKEN", msg: result.err });
      return;
    }

    if (!result.data) {
      res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Internal server error: Token info missing after validation",
      });
      return;
    }

    if (!result.data.email || !result.data.sub) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Unauthorized: Invalid token",
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
    res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Auth0 token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
