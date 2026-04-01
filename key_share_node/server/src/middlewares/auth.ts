import type {
  DiscordTokenInfo,
  GoogleTokenInfo,
} from "@oko-wallet/ksn-interface/auth";
import type { KSNodeApiErrorResponse } from "@oko-wallet/ksn-interface/response";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";
import type { NextFunction, Request, Response } from "express";

import {
  validateAuth0Token,
  validateDiscordOAuthToken,
  validateGithubOAuthToken,
  validateGoogleOAuthToken,
  validateTelegramToken,
} from "@oko-wallet-ksn-server/auth";
import type { Auth0TokenInfo } from "@oko-wallet-ksn-server/auth/auth0";
import type { GithubUserInfo } from "@oko-wallet-ksn-server/auth/github";
import type { TelegramUserInfo } from "@oko-wallet-ksn-server/auth/telegram";
import type { OAuthValidationFail } from "@oko-wallet-ksn-server/auth/types";
import type { XUserInfo } from "@oko-wallet-ksn-server/auth/x";
import { validateAccessTokenOfX } from "@oko-wallet-ksn-server/auth/x";
import { ErrorCodeMap } from "@oko-wallet-ksn-server/error";
import type { ResponseLocal } from "@oko-wallet-ksn-server/routes/io";

type OAuthBody = {
  auth_type?: AuthType;
};

type VerifyResult =
  | {
      auth_type: "google";
      data: Result<GoogleTokenInfo, OAuthValidationFail>;
    }
  | {
      auth_type: "auth0";
      data: Result<Auth0TokenInfo, OAuthValidationFail>;
    }
  | {
      auth_type: "x";
      data: Result<XUserInfo, OAuthValidationFail>;
    }
  | {
      auth_type: "telegram";
      data: Result<TelegramUserInfo, OAuthValidationFail>;
    }
  | {
      auth_type: "discord";
      data: Result<DiscordTokenInfo, OAuthValidationFail>;
    }
  | {
      auth_type: "github";
      data: Result<GithubUserInfo, OAuthValidationFail>;
    };

export interface AuthenticatedRequest<T = any>
  extends Request<any, any, T & OAuthBody> {}

export async function bearerTokenMiddleware(
  req: AuthenticatedRequest,
  res: Response<any, ResponseLocal>,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  // @NOTE: default to google if auth_type is not provided
  const authType = (req.body?.auth_type ?? "google") as AuthType;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const errorRes: KSNodeApiErrorResponse = {
      success: false,
      code: "UNAUTHORIZED",
      msg: "Authorization header with Bearer token required",
    };
    res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
    return;
  }

  const bearerToken = authHeader.substring(7).trim(); // skip "Bearer "

  try {
    let result: VerifyResult;
    switch (authType) {
      case "google":
        result = {
          auth_type: "google",
          data: await validateGoogleOAuthToken(bearerToken),
        };
        break;
      case "auth0":
        result = {
          auth_type: "auth0",
          data: await validateAuth0Token(bearerToken),
        };
        break;
      case "x":
        result = {
          auth_type: "x",
          data: await validateAccessTokenOfX(bearerToken),
        };
        break;
      case "telegram":
        result = {
          auth_type: "telegram",
          data: await validateTelegramToken(
            bearerToken,
            req.app.locals.telegram_bot_token,
          ),
        };
        break;
      case "discord":
        result = {
          auth_type: "discord",
          data: await validateDiscordOAuthToken(bearerToken),
        };
        break;
      case "github":
        result = {
          auth_type: "github",
          data: await validateGithubOAuthToken(bearerToken),
        };
        break;

      default: {
        const errorRes: KSNodeApiErrorResponse = {
          success: false,
          code: "UNAUTHORIZED",
          msg: `Invalid auth_type: ${authType}`,
        };
        res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
        return;
      }
    }

    if (!result.data.success) {
      const errorRes: KSNodeApiErrorResponse = {
        success: false,
        code: "UNAUTHORIZED",
        msg: result.data.err.message,
      };
      res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
      return;
    }

    switch (result.auth_type) {
      case "x": {
        if (!result.data.data.id) {
          const errorRes: KSNodeApiErrorResponse = {
            success: false,
            code: "UNAUTHORIZED",
            msg: "Invalid token: missing required field (id)",
          };
          res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
          return;
        }
        res.locals.oauth_user = {
          type: result.auth_type,
          user_identifier: `x_${result.data.data.id}`,
        };
        break;
      }
      case "telegram": {
        if (!result.data.data.id) {
          const errorRes: KSNodeApiErrorResponse = {
            success: false,
            code: "UNAUTHORIZED",
            msg: "Invalid token: missing required field (id)",
          };
          res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
          return;
        }
        res.locals.oauth_user = {
          type: result.auth_type,
          user_identifier: `telegram_${result.data.data.id}`,
        };
        break;
      }
      case "discord": {
        if (!result.data.data.id) {
          const errorRes: KSNodeApiErrorResponse = {
            success: false,
            code: "UNAUTHORIZED",
            msg: "Invalid token: missing required field (id)",
          };
          res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
          return;
        }
        res.locals.oauth_user = {
          type: result.auth_type,
          user_identifier: `discord_${result.data.data.id}`,
        };
        break;
      }
      case "google": {
        if (!result.data.data.sub || !result.data.data.email) {
          const errorRes: KSNodeApiErrorResponse = {
            success: false,
            code: "UNAUTHORIZED",
            msg: "Invalid token: missing required field (sub or email)",
          };
          res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
          return;
        }
        res.locals.oauth_user = {
          type: result.auth_type,
          user_identifier: `google_${result.data.data.sub}`,
        };
        break;
      }
      case "auth0": {
        if (!result.data.data.email || !result.data.data.sub) {
          const errorRes: KSNodeApiErrorResponse = {
            success: false,
            code: "UNAUTHORIZED",
            msg: "Invalid token: missing required field (email or sub)",
          };
          res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
          return;
        }
        res.locals.oauth_user = {
          type: result.auth_type,
          user_identifier: result.data.data.email,
        };
        break;
      }
      case "github": {
        if (result.data.data.id == null) {
          const errorRes: KSNodeApiErrorResponse = {
            success: false,
            code: "UNAUTHORIZED",
            msg: "Invalid token: missing required field (id)",
          };
          res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
          return;
        }
        res.locals.oauth_user = {
          type: result.auth_type,
          user_identifier: `github_${result.data.data.id}`,
        };
        break;
      }
    }

    next();
    return;
  } catch (error) {
    const errorRes: KSNodeApiErrorResponse = {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
    res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
    return;
  }
}
