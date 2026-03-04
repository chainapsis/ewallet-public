import type { Response, Request } from "express";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  SocialLoginGithubBody,
  SocialLoginGithubResponse,
} from "@oko-wallet/oko-types/social_login";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  SocialLoginGithubRequestSchema,
  SocialLoginGithubSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/social_login";

import {
  GITHUB_CLIENT_ID,
  GITHUB_SOCIAL_LOGIN_TOKEN_URL,
} from "@oko-wallet-api/api/github";

registry.registerPath({
  method: "post",
  path: "/social-login/v1/github/get-token",
  tags: ["Social Login"],
  summary: "Get GitHub access token",
  description:
    "Exchange authorization code for a GitHub access token using PKCE",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SocialLoginGithubRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully retrieved access token",
      content: {
        "application/json": {
          schema: SocialLoginGithubSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export async function getGithubToken(
  req: Request<any, any, SocialLoginGithubBody>,
  res: Response<OkoApiResponse<SocialLoginGithubResponse>>,
) {
  const body = req.body;

  if (!body.code || !body.code_verifier || !body.redirect_uri) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: "Code, code_verifier, or redirect_uri is not set",
    });
    return;
  }

  try {
    const reqBody = new URLSearchParams({
      code: body.code,
      grant_type: "authorization_code",
      client_id: GITHUB_CLIENT_ID,
      client_secret: req.app.locals.github_client_secret,
      redirect_uri: body.redirect_uri,
      code_verifier: body.code_verifier,
    });

    const response = await fetch(GITHUB_SOCIAL_LOGIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: reqBody,
    });

    if (response.status === 200) {
      const data: SocialLoginGithubResponse & {
        error?: string;
        error_description?: string;
      } = await response.json();

      if (data.error) {
        res.status(400).json({
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `${data.error}: ${data.error_description}`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          token_type: data.token_type,
          scope: data.scope,
        },
      });
      return;
    }

    res.status(response.status).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: await response.text(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to exchange GitHub token";
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: message,
    });
  }
}
