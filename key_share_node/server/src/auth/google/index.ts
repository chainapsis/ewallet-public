import type { GoogleTokenInfo } from "@oko-wallet/ksn-interface/auth";
import type { Result } from "@oko-wallet/stdlib-js";

import type { OAuthValidationFail } from "../types";
import { GOOGLE_CLIENT_ID } from "./client_id";

export async function validateGoogleOAuthToken(
  idToken: string,
): Promise<Result<GoogleTokenInfo, OAuthValidationFail>> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`,
    );
    if (!res.ok) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          message: "Invalid or malformed token",
        },
      };
    }
    const tokenInfo = (await res.json()) as GoogleTokenInfo;

    if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      return {
        success: false,
        err: {
          type: "client_id_not_same",
          message: `Token client ID does not match. expected: ${GOOGLE_CLIENT_ID}, actual: ${tokenInfo.aud}`,
        },
      };
    }

    if (
      tokenInfo.iss !== "https://accounts.google.com" &&
      tokenInfo.iss !== "https://oauth2.googleapis.com"
    ) {
      return {
        success: false,
        err: {
          type: "invalid_issuer",
          message: `Invalid token issuer: ${tokenInfo.iss}`,
        },
      };
    }

    if (tokenInfo.exp && Number(tokenInfo.exp) <= Date.now() / 1000) {
      return {
        success: false,
        err: {
          type: "token_expired",
          message: "Token has expired",
        },
      };
    }

    if (tokenInfo.email_verified !== "true") {
      return {
        success: false,
        err: {
          type: "email_not_verified",
          message: "Email address is not verified",
        },
      };
    }

    return {
      success: true,
      data: tokenInfo,
    };
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
