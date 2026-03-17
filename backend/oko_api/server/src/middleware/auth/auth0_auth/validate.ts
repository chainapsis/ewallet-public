import type { Result } from "@oko-wallet/stdlib-js";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";

import { AUTH0_DOMAIN } from "@oko-wallet-api/middleware/auth/auth0_auth/client_id";
import {
  createJwksCache,
  jwkToPem,
} from "@oko-wallet-api/middleware/auth/jwks_cache";

interface Auth0IdTokenPayload extends JwtPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
  nonce?: string;
}

interface ValidateAuth0IdTokenArgs {
  idToken: string;
  clientId: string;
  domain: string;
  expectedEmail?: string;
  expectedNonce?: string;
}

export interface Auth0UserInfo {
  email: string;
  name?: string;
  sub: string;
  nonce?: string;
}

const auth0Jwks = createJwksCache(
  `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  "Auth0",
);

export async function validateAuth0IdToken(
  args: ValidateAuth0IdTokenArgs,
): Promise<Result<Auth0UserInfo, string>> {
  try {
    const decoded = jwt.decode(args.idToken, { complete: true });
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

    const jwk = await auth0Jwks.getSigningKey(header.kid);
    if (!jwk) {
      return {
        success: false,
        err: "Unable to find matching signing key for token",
      };
    }

    const pem = jwkToPem(jwk);

    const payload = jwt.verify(args.idToken, pem, {
      algorithms: ["RS256"],
      audience: args.clientId,
      issuer: `https://${args.domain}/`,
    }) as Auth0IdTokenPayload;

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
        err: "Email not verified in Auth0 token",
      };
    }

    if (
      args.expectedEmail &&
      normalizeEmail(payload.email) !== normalizeEmail(args.expectedEmail)
    ) {
      return {
        success: false,
        err: "Email mismatch between request and token",
      };
    }

    if (args.expectedNonce && payload.nonce !== args.expectedNonce) {
      return {
        success: false,
        err: "Nonce mismatch",
      };
    }

    return {
      success: true,
      data: {
        email: payload.email,
        name: typeof payload.name === "string" ? payload.name : undefined,
        sub: payload.sub,
        nonce: payload.nonce,
      },
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        err: `Invalid Auth0 token: ${error.message}`,
      };
    }

    return {
      success: false,
      err: `Failed to validate Auth0 token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
