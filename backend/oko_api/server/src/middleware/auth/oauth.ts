import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { NextFunction, Request, Response } from "express";

import {
  type Auth0AuthenticatedRequest,
  auth0AuthMiddleware,
} from "@oko-wallet-api/middleware/auth/auth0_auth";
import {
  type DiscordAuthenticatedRequest,
  discordAuthMiddleware,
} from "@oko-wallet-api/middleware/auth/discord_auth";
import {
  type GithubAuthenticatedRequest,
  githubAuthMiddleware,
} from "@oko-wallet-api/middleware/auth/github_auth";
import {
  type GoogleAuthenticatedRequest,
  googleAuthMiddleware,
} from "@oko-wallet-api/middleware/auth/google_auth";
import {
  type TelegramAuthenticatedRequest,
  telegramAuthMiddleware,
} from "@oko-wallet-api/middleware/auth/telegram_auth";
import type {
  OAuthBody,
  OAuthLocals,
} from "@oko-wallet-api/middleware/auth/types";
import {
  type XAuthenticatedRequest,
  xAuthMiddleware,
} from "@oko-wallet-api/middleware/auth/x_auth";

// biome-ignore lint/complexity/noBannedTypes: default generic param
export type OAuthAuthenticatedRequest<T = {}> = Request<
  any,
  any,
  OAuthBody & T
>;

export async function oauthMiddleware(
  req: OAuthAuthenticatedRequest,
  res: Response<unknown, OAuthLocals>,
  next: NextFunction,
): Promise<void> {
  // @NOTE: default to google if auth_type is not provided
  const authType = (req.body?.auth_type ?? "google") as AuthType;

  switch (authType) {
    case "google":
      return googleAuthMiddleware(req as GoogleAuthenticatedRequest, res, next);
    case "auth0":
      return auth0AuthMiddleware(req as Auth0AuthenticatedRequest, res, next);
    case "x":
      return xAuthMiddleware(req as XAuthenticatedRequest, res, next);
    case "telegram":
      return telegramAuthMiddleware(
        req as TelegramAuthenticatedRequest,
        res,
        next,
      );
    case "discord":
      return discordAuthMiddleware(
        req as DiscordAuthenticatedRequest,
        res,
        next,
      );
    case "github":
      return githubAuthMiddleware(req as GithubAuthenticatedRequest, res, next);
    default:
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: `Invalid auth_type: ${authType}. Must be 'google', 'auth0', 'x', 'telegram', 'discord', or 'github'`,
      });
      return;
  }
}
