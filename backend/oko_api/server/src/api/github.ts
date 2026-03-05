import type { SocialLoginGithubVerifyUserResponse } from "@oko-wallet/oko-types/social_login";
import type { Result } from "@oko-wallet/stdlib-js";

export const GITHUB_SOCIAL_LOGIN_TOKEN_URL =
  "https://github.com/login/oauth/access_token";
export const GITHUB_USER_INFO_URL = "https://api.github.com/user";
export const GITHUB_CLIENT_ID = "Iv23limwRjerP82VKFmp";

export async function getGithubUserInfo(accessToken: string): Promise<
  Result<
    SocialLoginGithubVerifyUserResponse,
    {
      status: number;
      text: string;
    }
  >
> {
  const res = await fetch(GITHUB_USER_INFO_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (res.ok) {
    return {
      success: true,
      data: await res.json(),
    };
  }

  return {
    success: false,
    err: {
      status: res.status,
      text: await res.text(),
    },
  };
}
