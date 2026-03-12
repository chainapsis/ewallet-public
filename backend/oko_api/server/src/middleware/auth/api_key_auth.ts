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
    res.status(401).json({ error: "API key is required" });
    return;
  }

  try {
    const getApiKeyRes = await getAPIKeyByHashedKey(
      req.app.locals.db,
      apiKey as string,
    );
    if (!getApiKeyRes.success) {
      res
        .status(500)
        .json({ error: `getAPIKeyByHashedKey error: ${getApiKeyRes.err}` });
      return;
    }

    const apiKeyData = getApiKeyRes.data;
    if (apiKeyData === null) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    if (!apiKeyData.is_active) {
      res.status(401).json({ error: "API key is not active" });
      return;
    }

    res.locals.api_key = apiKeyData;
    next();
    return;
  } catch (error) {
    res.status(500).json({
      error: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
