import type { Result } from "@oko-wallet/stdlib-js";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";

import { GOOGLE_CLIENT_ID } from "@oko-wallet-api/middleware/auth/google_auth/client_id";
import {
  createJwksCache,
  jwkToPem,
} from "@oko-wallet-api/middleware/auth/jwks_cache";

interface GoogleIdTokenPayload extends JwtPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export interface GoogleUserInfo {
  email: string;
  sub: string;
  name?: string;
}

const googleJwks = createJwksCache(
  "https://www.googleapis.com/oauth2/v3/certs",
  "Google",
);

export async function validateOAuthToken(
  idToken: string,
): Promise<Result<GoogleUserInfo, string>> {
  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === "string") {
      return {
        success: false,
        err: "Invalid token format",
      };
    }

    const header = decoded.header as JwtHeader;
    if (!header.kid) {
      return {
        success: false,
        err: "Missing key id in token header",
      };
    }

    const jwk = await googleJwks.getSigningKey(header.kid);
    if (!jwk) {
      return {
        success: false,
        err: "Unable to find matching signing key for token",
      };
    }

    const pem = jwkToPem(jwk);

    const payload = jwt.verify(idToken, pem, {
      algorithms: ["RS256"],
      audience: GOOGLE_CLIENT_ID,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    }) as GoogleIdTokenPayload;

    if (!payload.sub) {
      return {
        success: false,
        err: "Token missing subject claim",
      };
    }

    if (!payload.email) {
      return {
        success: false,
        err: "Token missing email claim",
      };
    }

    if (!payload.email_verified) {
      return {
        success: false,
        err: "Email not verified",
      };
    }

    return {
      success: true,
      data: {
        email: payload.email,
        sub: payload.sub,
        name: typeof payload.name === "string" ? payload.name : undefined,
      },
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        err: `Invalid Google token: ${error.message}`,
      };
    }

    return {
      success: false,
      err: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
