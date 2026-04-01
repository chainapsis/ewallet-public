import type { Result } from "@oko-wallet/stdlib-js";

import type { OAuthValidationFail } from "../types";
import type { TelegramUserData, TelegramUserInfo } from "./types";
import { validateTelegramHash } from "./validate_hash";
import { validateTelegramJwt } from "./validate_jwt";

export type { TelegramUserData, TelegramUserInfo };
export { validateTelegramHash, validateTelegramJwt };

// JSON-stringified objects always start with "{", JWTs always start with "eyJ"
export async function validateTelegramToken(
  bearerToken: string,
  telegramBotToken: string,
): Promise<Result<TelegramUserInfo, OAuthValidationFail>> {
  if (bearerToken.startsWith("{")) {
    let userData: TelegramUserData;
    try {
      userData = JSON.parse(bearerToken) as TelegramUserData;
    } catch {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Invalid token format: Expected JSON string",
        },
      };
    }
    return validateTelegramHash(userData, telegramBotToken);
  }

  return validateTelegramJwt(bearerToken);
}
