import type { Result } from "@oko-wallet/stdlib-js";

import type { GithubUserInfo } from "@oko-wallet-attached/window_msgs/types";
import { OKO_API_ENDPOINT } from "@oko-wallet-attached/requests/endpoints";

export async function getAccessTokenOfGithub(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<Result<string, string>> {
  try {
    const response = await fetch(
      `${OKO_API_ENDPOINT}/social-login/v1/github/get-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        err: `Token exchange failed: ${response.status} ${errorText}`,
      };
    }

    const result = await response.json();
    if (!result.success) {
      return {
        success: false,
        err: result.msg || "Token exchange failed",
      };
    }

    return { success: true, data: result.data.access_token };
  } catch (err: unknown) {
    return {
      success: false,
      err: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function verifyIdTokenOfGithub(
  accessToken: string,
): Promise<Result<GithubUserInfo, string>> {
  try {
    const response = await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        err: `Failed to get user info: ${response.status} ${errorText}`,
      };
    }

    const result = (await response.json()) as GithubUserInfo;
    if (result.id == null) {
      return {
        success: false,
        err: "GitHub id not found",
      };
    }

    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      err: err instanceof Error ? err.message : String(err),
    };
  }
}
