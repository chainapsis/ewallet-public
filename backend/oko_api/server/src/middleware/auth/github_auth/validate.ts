import type { Result } from "@oko-wallet/stdlib-js";
import type { SocialLoginGithubVerifyUserResponse } from "@oko-wallet/oko-types/social_login";

import { getGithubUserInfo } from "@oko-wallet-api/api/github";

export async function validateAccessTokenOfGithub(
  accessToken: string,
): Promise<Result<SocialLoginGithubVerifyUserResponse, string>> {
  try {
    const res = await getGithubUserInfo(accessToken);
    if (!res.success) {
      if (res.err.status === 429) {
        return {
          success: false,
          err: "Too Many Requests",
        };
      }
      return {
        success: false,
        err: `Invalid token: ${res.err.text}`,
      };
    }

    return {
      success: true,
      data: res.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      err: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
