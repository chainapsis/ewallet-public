import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { NextFunction, Request, Response } from "express";

import { validateAccessTokenOfGithub } from "@oko-wallet-api/middleware/auth/github_auth/validate";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

export interface GithubAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function githubAuthMiddleware(
  req: GithubAuthenticatedRequest,
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

  const accessToken = authHeader.substring(7).trim();

  try {
    const result = await validateAccessTokenOfGithub(accessToken);

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

    if (result.data.id == null) {
      res.status(401).json({
        error: "Can't get id from GitHub token",
      });
      return;
    }

    res.locals.oauth_user = {
      type: "github" as AuthType,
      user_identifier: `github_${result.data.id}`,
      email: result.data.email ?? undefined,
      name: result.data.login,
      metadata: result.data as unknown as Record<string, unknown>,
    };

    next();
    return;
  } catch (err: unknown) {
    res.status(500).json({
      error: `Token validation failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }
}
