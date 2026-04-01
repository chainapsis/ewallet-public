import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { NextFunction, Request, Response } from "express";

import {
  type TelegramUserData,
  type TelegramUserInfo,
  validateTelegramHash,
} from "@oko-wallet-api/middleware/auth/telegram_auth/validate";
import { validateTelegramJwt } from "@oko-wallet-api/middleware/auth/telegram_auth/validate_jwt";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

export interface TelegramAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function telegramAuthMiddleware(
  req: TelegramAuthenticatedRequest,
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

  const bearerToken = authHeader.substring(7).trim(); // skip "Bearer "

  // Dual-validation: detect legacy JSON vs OIDC JWT
  // JSON-stringified objects always start with "{", JWTs never do (they start with "eyJ")
  if (bearerToken.startsWith("{")) {
    // Legacy HMAC path
    await handleLegacyHmac(req, res, next, bearerToken);
  } else {
    // OIDC JWT path
    await handleJwt(req, res, next, bearerToken);
  }
}

async function handleLegacyHmac(
  req: TelegramAuthenticatedRequest,
  res: Response<unknown, OAuthLocals>,
  next: NextFunction,
  bearerToken: string,
) {
  let userData: TelegramUserData;
  try {
    userData = JSON.parse(bearerToken) as TelegramUserData;
  } catch (_error) {
    res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
      success: false,
      code: "INVALID_AUTH_TOKEN",
      msg: "Invalid token format: Expected JSON string",
    });
    return;
  }

  try {
    const telegramBotToken = req.app.locals.telegram_bot_token;
    const result = validateTelegramHash(userData, telegramBotToken);
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
        msg: "Internal server error: User info missing after validation",
      });
      return;
    }

    const userInfo: TelegramUserInfo = result.data;
    if (!userInfo.id) {
      res.status(ErrorCodeMap.INVALID_AUTH_TOKEN).json({
        success: false,
        code: "INVALID_AUTH_TOKEN",
        msg: "Can't get id from Telegram token",
      });
      return;
    }

    res.locals.oauth_user = {
      type: "telegram" as AuthType,
      user_identifier: `telegram_${userInfo.id}`,
      name: userInfo.username,
      metadata: userInfo as unknown as Record<string, unknown>,
    };

    next();
    return;
  } catch (error) {
    res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Hash validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}

async function handleJwt(
  req: TelegramAuthenticatedRequest,
  res: Response<unknown, OAuthLocals>,
  next: NextFunction,
  bearerToken: string,
) {
  try {
    const result = await validateTelegramJwt(bearerToken);

    if (!result.success) {
      res.status(401).json({ error: result.err });
      return;
    }

    if (!result.data.id) {
      res.status(401).json({
        error: "Can't get id from Telegram JWT",
      });
      return;
    }

    res.locals.oauth_user = {
      type: "telegram" as AuthType,
      user_identifier: `telegram_${result.data.id}`,
      name: result.data.username,
      metadata: result.data as unknown as Record<string, unknown>,
    };

    next();
    return;
  } catch (error) {
    res.status(500).json({
      error: `JWT validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
