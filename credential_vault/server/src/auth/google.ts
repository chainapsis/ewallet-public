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

export interface OAuthTokenValidationResult {
  isValid: boolean;
  tokenInfo?: GoogleTokenInfoResponse;
  error?: string;
}

export async function validateOAuthToken(
  idToken: string,
): Promise<OAuthTokenValidationResult> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`,
    );
    if (!res.ok) {
      return { isValid: false, error: "Invalid token" };
    }
    const tokenInfo = (await res.json()) as GoogleTokenInfoResponse;

    if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      return { isValid: false, error: "Invalid client_id" };
    }

    if (
      tokenInfo.iss !== "https://accounts.google.com" &&
      tokenInfo.iss !== "https://oauth2.googleapis.com"
    ) {
      return { isValid: false, error: "Invalid issuer" };
    }

    if (tokenInfo.exp && Number(tokenInfo.exp) <= Date.now() / 1000) {
      return { isValid: false, error: "Token expired" };
    }

    if (tokenInfo.email_verified !== "true") {
      return { isValid: false, error: "Email not verified" };
    }

    return {
      isValid: true,
      tokenInfo,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Token validation failed: ${error.message}`,
    };
  }
}
