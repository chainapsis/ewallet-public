import type { Result } from "@oko-wallet/stdlib-js";

import { OKO_API_ENDPOINT } from "@oko-wallet-attached/requests/endpoints";

export async function getIdTokenOfTelegram(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<Result<string, string>> {
  try {
    const response = await fetch(
      `${OKO_API_ENDPOINT}/social-login/v1/telegram/get-token`,
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

    return { success: true, data: result.data.id_token };
  } catch (err: unknown) {
    return {
      success: false,
      err: err instanceof Error ? err.message : String(err),
    };
  }
}
