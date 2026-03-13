import type { Result } from "@oko-wallet/stdlib-js";

import { OKO_API_ENDPOINT } from "@oko-wallet-attached/requests/endpoints";
import type { XUserInfo } from "@oko-wallet-attached/window_msgs/types";

export async function getAccessTokenOfX(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<Result<string, string>> {
  try {
    const response = await fetch(
      `${OKO_API_ENDPOINT}/social-login/v1/x/get-token`,
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
  } catch (err: any) {
    return { success: false, err: err.toString() };
  }
}

export async function verifyIdTokenOfX(
  accessToken: string,
): Promise<Result<XUserInfo, string>> {
  try {
    const response = await fetch(
      `${OKO_API_ENDPOINT}/social-login/v1/x/verify-user`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        err: `Failed to get user info: ${response.status} ${errorText}`,
      };
    }

    const result = await response.json();
    if (!result.data.id) {
      return {
        success: false,
        err: "X id not found",
      };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    return { success: false, err: err.toString() };
  }
}
