import type { Result } from "@keplr-ewallet/stdlib-js";

// TODO: This may change later
const GOOGLE_CLIENT_ID =
  "239646646986-8on7ql1vmbcshbjk12bdtopmto99iipm.apps.googleusercontent.com";

export interface GoogleTokenInfoResponse {
  alg: string;
  at_hash: string;
  aud: string;
  azp: string;
  email: string;
  email_verified: string;
  exp: string;
  family_name: string;
  given_name: string;
  iat: string;
  iss: string;
  kid: string;
  name: string;
  picture: string;
  sub: string;
  typ: string;
}

export async function validateOAuthToken(
  idToken: string,
): Promise<Result<GoogleTokenInfoResponse, string>> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`,
    );
    if (!res.ok) {
      return { success: false, err: "Invalid token" };
    }
    const tokenInfo = (await res.json()) as GoogleTokenInfoResponse;

    if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      return { success: false, err: "Invalid client_id" };
    }

    if (
      tokenInfo.iss !== "https://accounts.google.com" &&
      tokenInfo.iss !== "https://oauth2.googleapis.com"
    ) {
      return { success: false, err: "Invalid issuer" };
    }

    if (tokenInfo.exp && Number(tokenInfo.exp) <= Date.now() / 1000) {
      return { success: false, err: "Token expired" };
    }

    if (tokenInfo.email_verified !== "true") {
      return { success: false, err: "Email not verified" };
    }

    return {
      success: true,
      data: tokenInfo,
    };
  } catch (error: any) {
    return {
      success: false,
      err: `Token validation failed: ${error.message}`,
    };
  }
}
