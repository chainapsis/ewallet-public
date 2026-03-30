import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { NextFunction, Request, Response } from "express";

import { validateOAuthToken } from "@oko-wallet-api/middleware/auth/google_auth/validate";
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
    res.status(ErrorCodeMap.UNAUTHORIZED).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "Authorization header with Bearer token required",
    });
    return;
  }

  const idToken = authHeader.substring(7); // skip "Bearer "

  try {
    const result = await validateOAuthToken(idToken);

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

    if (!result.data.sub || !result.data.email) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Can't get sub or email from Google token",
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
    res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
