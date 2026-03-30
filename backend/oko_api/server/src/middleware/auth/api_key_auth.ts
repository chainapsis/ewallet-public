import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { getAPIKeyByHashedKey } from "@oko-wallet/oko-pg-interface/api_keys";
import type { NextFunction, Request, Response } from "express";

export interface APIKeyAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function apiKeyMiddleware(
  req: APIKeyAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    res.status(ErrorCodeMap.UNAUTHORIZED).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "API key is required",
    });
    return;
  }

  try {
    const getApiKeyRes = await getAPIKeyByHashedKey(
      req.app.locals.db,
      apiKey as string,
    );
    if (!getApiKeyRes.success) {
      res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getAPIKeyByHashedKey error: ${getApiKeyRes.err}`,
      });
      return;
    }

    const apiKeyData = getApiKeyRes.data;
    if (apiKeyData === null) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Invalid API key",
      });
      return;
    }

    if (!apiKeyData.is_active) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "API key is not active",
      });
      return;
    }

    res.locals.api_key = apiKeyData;
    next();
    return;
  } catch (error) {
    res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
