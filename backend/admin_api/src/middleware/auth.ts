import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { NextFunction, Request, Response } from "express";

import { verifyAdminToken } from "@oko-wallet-admin-api/auth";

export { typeformWebhookMiddleware } from "./typeform_webhook";

export type AuthenticatedAdminRequest<T = any> = Request<any, any, T, any> & {};

export function adminAuthMiddleware(
  req: Request,
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

  const token = authHeader.substring(7);

  const state = req.app.locals;
  const verifyResult = verifyAdminToken({
    token,
    jwt_config: {
      secret: state.jwt_secret,
    },
  });

  if (!verifyResult.success) {
    res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
      success: false,
      code: "INVALID_AUTH_TOKEN",
      msg: verifyResult.err || "Invalid token",
    });
    return;
  }

  res.locals.admin = {
    user_id: verifyResult.data.sub,
    role: verifyResult.data.role,
    type: verifyResult.data.type,
  };

  next();
}
