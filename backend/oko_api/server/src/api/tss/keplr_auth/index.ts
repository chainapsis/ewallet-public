import type { TokenResult } from "@oko-wallet/oko-types/auth";
import type {
  GenerateUserTokenArgs,
  GenerateUserTokenArgsV2,
  UserTokenPayload,
  UserTokenPayloadV2,
} from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";
import dayjs from "dayjs";
import jwt from "jsonwebtoken";

import type {
  UserTokenJWTPayload,
  UserTokenJWTPayloadV2,
  VerifyUserTokenResult,
} from "./types";

export const USER_ISSUER = "https://api.oko.app";
export const USER_AUDIENCE = "https://api.oko.app";

const EXPIRATION_WINDOW = 1 * 24 * 60 * 60 * 1000; // 1 day in ms

export function generateUserToken(
  args: GenerateUserTokenArgs,
): Result<TokenResult, string> {
  try {
    const payload: UserTokenPayload = {
      email: args.email,
      wallet_id: args.wallet_id,
      type: "user",
    };

    // We check expiration on our end to more sophisticatedly handle token expiry
    const token: string = jwt.sign(payload, args.jwt_config.secret, {
      algorithm: "HS256",
      expiresIn: args.jwt_config.expires_in as jwt.SignOptions["expiresIn"],
      issuer: USER_ISSUER,
      audience: USER_AUDIENCE,
    });

    return {
      success: true,
      data: {
        token,
      },
    };
  } catch (error: any) {
    console.error("generateUserToken error:", error);

    return {
      success: false,
      err: `Failed to generate token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function generateUserTokenV2(
  args: GenerateUserTokenArgsV2,
): Result<TokenResult, string> {
  try {
    const payload: UserTokenPayloadV2 = {
      email: args.email,
      wallet_id_secp256k1: args.wallet_id_secp256k1,
      wallet_id_ed25519: args.wallet_id_ed25519,
      type: "user",
    };

    // We check expiration on our end to more sophisticatedly handle token expiry
    const token: string = jwt.sign(payload, args.jwt_config.secret, {
      algorithm: "HS256",
      expiresIn: args.jwt_config.expires_in as jwt.SignOptions["expiresIn"],
      issuer: USER_ISSUER,
      audience: USER_AUDIENCE,
    });

    return {
      success: true,
      data: {
        token,
      },
    };
  } catch (error: any) {
    console.error("generateUserToken error:", error);

    return {
      success: false,
      err: `Failed to generate token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export interface VerifyUserTokenArgs {
  token: string;
  jwt_config: {
    secret: string;
  };
}

export function verifyUserToken(
  args: VerifyUserTokenArgs,
): Result<UserTokenPayload, VerifyUserTokenResult> {
  try {
    const payload = jwt.verify(args.token, args.jwt_config.secret, {
      issuer: USER_ISSUER,
      audience: USER_AUDIENCE,
      ignoreExpiration: true, // We will check expiration manually
    }) as UserTokenJWTPayload;

    if (!payload.iat) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          msg: "Token missing issued at time",
        },
      };
    }

    const now = dayjs();
    const issuedAt = dayjs(new Date(payload.iat * 1000));
    const isOrWillSoonBeExpired = now.diff(issuedAt) > EXPIRATION_WINDOW * 0.75;

    if (isOrWillSoonBeExpired) {
      return {
        success: false,
        err: { type: "expired", payload },
      };
    }

    return {
      success: true,
      data: payload,
    };
  } catch (err: any) {
    console.error("verifyUserToken error:", err);

    if (err instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          msg: `Invalid token, err: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    } else {
      return {
        success: false,
        err: {
          type: "unknown_error",
          msg: `JWT Verification fail, err: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }
}

export function verifyUserTokenV2(
  args: VerifyUserTokenArgs,
): Result<UserTokenPayloadV2, VerifyUserTokenResult> {
  try {
    const payload = jwt.verify(args.token, args.jwt_config.secret, {
      issuer: USER_ISSUER,
      audience: USER_AUDIENCE,
      ignoreExpiration: true, // We will check expiration manually
    }) as UserTokenJWTPayloadV2;

    if (!payload.iat) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          msg: "Token missing issued at time",
        },
      };
    }

    const now = dayjs();
    const issuedAt = dayjs(new Date(payload.iat * 1000));
    const isOrWillSoonBeExpired = now.diff(issuedAt) > EXPIRATION_WINDOW * 0.75;

    if (isOrWillSoonBeExpired) {
      return {
        success: false,
        err: { type: "expired", payload },
      };
    }

    return {
      success: true,
      data: payload,
    };
  } catch (err: any) {
    console.error("verifyUserToken error:", err);

    if (err instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        err: {
          type: "invalid_token",
          msg: `Invalid token, err: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    } else {
      return {
        success: false,
        err: {
          type: "unknown_error",
          msg: `JWT Verification fail, err: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }
}
