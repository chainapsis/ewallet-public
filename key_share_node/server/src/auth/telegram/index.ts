import type { Result } from "@oko-wallet/stdlib-js";
import crypto from "crypto";

import type { OAuthValidationFail } from "../types";

export { validateTelegramJwt } from "./validate_jwt";

export interface TelegramUserData {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

export interface TelegramUserInfo {
  id: string;
  username?: string;
}

export function validateTelegramHash(
  userData: TelegramUserData,
  telegramBotToken: string,
): Result<TelegramUserInfo, OAuthValidationFail> {
  if (!userData.id || !userData.auth_date || !userData.hash) {
    return {
      success: false,
      err: {
        type: "invalid_token",
        message: "Missing required fields: id, auth_date, hash",
      },
    };
  }

  const { hash, ...dataWithoutHash } = userData;

  const dataCheckString = Object.keys(dataWithoutHash)
    .sort()
    .filter((key) => {
      const value = dataWithoutHash[key as keyof typeof dataWithoutHash];
      return value !== undefined && value !== null && value !== "";
    })
    .map(
      (key) => `${key}=${dataWithoutHash[key as keyof typeof dataWithoutHash]}`,
    )
    .join("\n");

  const secretKey = crypto
    .createHash("sha256")
    .update(telegramBotToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const receivedHashBuffer = Buffer.from(userData.hash, "hex");
  const calculatedHashBuffer = Buffer.from(calculatedHash, "hex");

  if (receivedHashBuffer.length !== calculatedHashBuffer.length) {
    return {
      success: false,
      err: {
        type: "invalid_token",
        message: "Invalid hash length",
      },
    };
  }

  if (!crypto.timingSafeEqual(receivedHashBuffer, calculatedHashBuffer)) {
    return {
      success: false,
      err: {
        type: "invalid_token",
        message: "Hash verification failed",
      },
    };
  }

  const authDate = parseInt(userData.auth_date, 10);
  if (Number.isNaN(authDate)) {
    return {
      success: false,
      err: {
        type: "invalid_token",
        message: "Invalid auth_date format",
      },
    };
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - authDate;

  if (timeDiff > 86400 || timeDiff < 0) {
    return {
      success: false,
      err: {
        type: "token_expired",
        message: "Auth date is too old or invalid",
      },
    };
  }

  return {
    success: true,
    data: {
      id: userData.id,
      username: userData.username,
    },
  };
}
