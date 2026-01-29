import type { Request, Response, NextFunction } from "express";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { validateDiscordOAuthToken } from "@oko-wallet-api/middleware/auth/discord_auth/validate";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

export interface DiscordAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function discordAuthMiddleware(
  req: DiscordAuthenticatedRequest,
  res: Response<unknown, OAuthLocals>,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Authorization header with Bearer token required" });
    return;
  }

  const idToken = authHeader.substring(7); // skip "Bearer "

  try {
    const result = await validateDiscordOAuthToken(idToken);

    if (!result.success) {
      res.status(401).json({ error: result.err });
      return;
    }

    if (!result.data) {
      res.status(500).json({
        error: "Internal server error: Token info missing after validation",
      });
      return;
    }

    if (!result.data.id) {
      res.status(401).json({
        error: "Can't get id from Discord token",
      });
      return;
    }

    res.locals.oauth_user = {
      type: "discord" as AuthType,
      // in discord, use discord id as identifier with prefix
      user_identifier: `discord_${result.data.id}`,
      email: result.data.email,
      name: result.data.username,
      metadata: result.data as unknown as Record<string, unknown>,
    };

    next();
    return;
  } catch (error) {
    res.status(500).json({
      error: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
