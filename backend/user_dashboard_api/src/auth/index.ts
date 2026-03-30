import type { UserTokenPayloadV2 } from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";
import dayjs from "dayjs";
import jwt from "jsonwebtoken";

import {
  SILENT_SIGNIN_MAX_TOKEN_AGE,
  USER_AUDIENCE,
  USER_ISSUER,
  USER_TOKEN_EXPIRATION_WINDOW,
} from "../constants";

export type UserTokenJWTPayloadV2 = UserTokenPayloadV2 & jwt.JwtPayload;

export type VerifyUserTokenResult =
  | { type: "invalid_token"; msg: string }
  | { type: "expired"; payload: UserTokenJWTPayloadV2; msg: string }
  | { type: "expired_beyond_renewal"; msg: string }
  | { type: "unknown_error"; msg: string };

export interface VerifyUserTokenArgs {
  token: string;
  jwt_config: {
    secret: string;
  };
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
    const tokenAgeMs = now.diff(issuedAt);

    if (tokenAgeMs > SILENT_SIGNIN_MAX_TOKEN_AGE) {
      return {
        success: false,
        err: {
          type: "expired_beyond_renewal",
          msg: "Token is too old for silent renewal. Please re-authenticate.",
        },
      };
    }

    const isOrWillSoonBeExpired =
      tokenAgeMs > USER_TOKEN_EXPIRATION_WINDOW * 0.75;

    if (isOrWillSoonBeExpired) {
      return {
        success: false,
        err: { type: "expired", payload, msg: "Token expired" },
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
