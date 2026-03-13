import type { DiscordTokenInfo } from "@oko-wallet/ksn-interface/auth";
import type { Result } from "@oko-wallet/stdlib-js";

export async function validateDiscordOAuthToken(
  idToken: string,
): Promise<Result<DiscordTokenInfo, string>> {
  try {
    const response = await fetch("https://discord.com/api/users/@me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[discord] Failed to get user info: %s %s",
        response.status,
        errorText,
      );
      return {
        success: false,
        err: `Failed to get user info: ${response.status} ${errorText}`,
      };
    }

    const result = await response.json();

    const userInfo = {
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
      err: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
