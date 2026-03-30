import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { NextFunction, Request, Response } from "express";

import {
  type TelegramUserData,
  type TelegramUserInfo,
  validateTelegramHash,
} from "@oko-wallet-api/middleware/auth/telegram_auth/validate";
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
      // in telegram, use telegram id as identifier with prefix
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
