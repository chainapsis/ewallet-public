import type { Result } from "@oko-wallet/stdlib-js";

import type { OAuthValidationFail } from "../types";

export const GITHUB_USER_INFO_URL = "https://api.github.com/user";

export interface GithubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export async function validateGithubOAuthToken(
  accessToken: string,
): Promise<Result<GithubUserInfo, OAuthValidationFail>> {
  try {
    const res = await fetch(GITHUB_USER_INFO_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        return {
          success: false,
          err: {
            type: "unknown",
            message: "Too Many Requests",
          },
        };
      }
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Invalid or malformed token",
        },
      };
    }

    const userInfo: GithubUserInfo = await res.json();

    return {
      success: true,
      data: userInfo,
    };
  } catch (err: unknown) {
    return {
      success: false,
      err: {
        type: "unknown",
        message: `Token validation failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }
}
