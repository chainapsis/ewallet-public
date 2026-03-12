import type { DiscordTokenInfo } from "@oko-wallet/ksn-interface/auth";
import type { Result } from "@oko-wallet/stdlib-js";

import type { OAuthValidationFail } from "../types";
import { logger } from "@oko-wallet-ksn-server/logger";

export async function validateDiscordOAuthToken(
  idToken: string,
): Promise<Result<DiscordTokenInfo, OAuthValidationFail>> {
  try {
    const response = await fetch("https://discord.com/api/users/@me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        "[discord] Failed to get user info: %s %s",
        response.status,
        errorText,
      );
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: `Failed to get user info: ${response.status} ${errorText}`,
        },
      };
    }

    const result = await response.json();

    if (!result.email) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Can't get email from Discord token",
        },
      };
    }

    const userInfo: DiscordTokenInfo = {
      id: result.id,
      username: result.username,
      discriminator: result.discriminator,
      email: result.email,
      verified: result.verified,
      avatar: result.avatar,
      global_name: result.global_name,
    };

    return { success: true, data: userInfo };
  } catch (error: any) {
    return {
      success: false,
      err: {
        type: "unknown",
        message: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}
