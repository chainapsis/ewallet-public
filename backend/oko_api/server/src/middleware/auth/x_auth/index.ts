import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { NextFunction, Request, Response } from "express";

import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";
import { validateAccessTokenOfX } from "@oko-wallet-api/middleware/auth/x_auth/validate";

export interface XAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function xAuthMiddleware(
  req: XAuthenticatedRequest,
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

  const accessToken = authHeader.substring(7).trim(); // skip "Bearer "

  try {
    const result = await validateAccessTokenOfX(accessToken);

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

    if (!result.data.id) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Can't get id from X token",
      });
      return;
    }

    res.locals.oauth_user = {
      type: "x" as AuthType,
      // in x, use x id as email identifier with prefix
      user_identifier: `x_${result.data.id}`,
      name: result.data.username,
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
