import type { TokenResult } from "@oko-wallet/oko-types/auth";
import type {
  CustomerTokenPayload,
  CustomerVerifyResult,
  GenerateCustomerTokenArgs,
  VerifyCustomerTokenArgs,
} from "@oko-wallet/oko-types/ct_dashboard";
import type {
  UserTokenPayload,
  UserTokenPayloadV2,
} from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";
import dayjs from "dayjs";
import jwt from "jsonwebtoken";

import {
  CUSTOMER_AUDIENCE,
  CUSTOMER_ISSUER,
  USER_AUDIENCE,
  USER_ISSUER,
  USER_TOKEN_EXPIRATION_WINDOW,
} from "../constants";

export type UserTokenJWTPayload = UserTokenPayload & jwt.JwtPayload;
export type UserTokenJWTPayloadV2 = UserTokenPayloadV2 & jwt.JwtPayload;
export type VerifyUserTokenResult =
  | { type: "invalid_token"; msg: string }
  | { type: "expired"; payload: UserTokenJWTPayload | UserTokenJWTPayloadV2 }
  | { type: "unknown_error"; msg: string };
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
    const isOrWillSoonBeExpired =
      now.diff(issuedAt) > USER_TOKEN_EXPIRATION_WINDOW * 0.75;

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
  } catch (err) {
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
      ignoreExpiration: true,
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
    const isOrWillSoonBeExpired =
      now.diff(issuedAt) > USER_TOKEN_EXPIRATION_WINDOW * 0.75;

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
  } catch (err) {
    console.error("verifyUserTokenV2 error:", err);

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

export function generateCustomerToken(
  args: GenerateCustomerTokenArgs,
): Result<TokenResult, string> {
  try {
    const payload: CustomerTokenPayload = {
      sub: args.user_id,
      type: "customer",
    };

    const token: string = jwt.sign(payload, args.jwt_config.secret, {
      algorithm: "HS256",
      expiresIn: args.jwt_config.expires_in as jwt.SignOptions["expiresIn"],
      issuer: CUSTOMER_ISSUER,
      audience: CUSTOMER_AUDIENCE,
    });

    return {
      success: true,
      data: {
        token,
      },
    };
  } catch (error) {
    console.error("Customer token generation error:", error);
    return {
      success: false,
      err: `Failed to generate token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function verifyCustomerToken(
  args: VerifyCustomerTokenArgs,
): CustomerVerifyResult {
  try {
    const payload = jwt.verify(args.token, args.jwt_config.secret, {
      issuer: CUSTOMER_ISSUER,
      audience: CUSTOMER_AUDIENCE,
    }) as CustomerTokenPayload;

    if (payload.type !== "customer") {
      return {
        success: false,
        error: "Invalid token type",
      };
    }

    return {
      success: true,
      payload,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: `Invalid token: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: `Token expired: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    console.error("Customer token verification error:", error);
    return {
      success: false,
      error: `Token verification failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
