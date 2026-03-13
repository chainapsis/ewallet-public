import type { GoogleTokenInfo } from "@oko-wallet/ksn-interface/auth";
import type { Result } from "@oko-wallet/stdlib-js";

export async function validateOAuthToken(
  idToken: string,
  googleClientId: string,
): Promise<Result<GoogleTokenInfo, string>> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`,
    );
    if (!res.ok) {
      return {
        success: false,
        err: "Invalid token",
      };
    }
    const tokenInfo = (await res.json()) as GoogleTokenInfo;

    if (tokenInfo.aud !== googleClientId) {
      return {
        success: false,
        err: "Invalid client_id",
      };
    }

    if (
      tokenInfo.iss !== "https://accounts.google.com" &&
      tokenInfo.iss !== "https://oauth2.googleapis.com"
    ) {
      return {
        success: false,
        err: "Invalid issuer",
      };
    }

    if (tokenInfo.exp && Number(tokenInfo.exp) <= Date.now() / 1000) {
      return {
        success: false,
        err: "Token expired",
      };
    }

    if (tokenInfo.email_verified !== "true") {
      return {
        success: false,
        err: "Email not verified",
      };
    }

    return {
      success: true,
      data: tokenInfo,
    };
  } catch (error: any) {
    return {
      success: false,
      err: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
