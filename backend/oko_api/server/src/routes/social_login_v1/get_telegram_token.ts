import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  SocialLoginTelegramRequestSchema,
  SocialLoginTelegramSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/social_login";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  SocialLoginTelegramBody,
  SocialLoginTelegramResponse,
} from "@oko-wallet/oko-types/social_login";
import type { Request, Response } from "express";
import { Agent } from "undici";

const TELEGRAM_OIDC_TOKEN_URL = "https://oauth.telegram.org/token";

// oauth.telegram.org has AAAA records but IPv6 connectivity is unreliable.
// Force IPv4 to prevent intermittent ETIMEDOUT from Happy Eyeballs.
const telegramAgent = new Agent({ connect: { family: 4 } });

registry.registerPath({
  method: "post",
  path: "/social-login/v1/telegram/get-token",
  tags: ["Social Login"],
  summary: "Get Telegram OIDC ID token",
  description:
    "Exchange authorization code for a Telegram OIDC ID token using PKCE",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SocialLoginTelegramRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully retrieved ID token",
      content: {
        "application/json": {
          schema: SocialLoginTelegramSuccessResponseSchema,
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

export async function getTelegramToken(
  req: Request<any, any, SocialLoginTelegramBody>,
  res: Response<OkoApiResponse<SocialLoginTelegramResponse>>,
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
    const clientId: string | undefined = req.app.locals.telegram_client_id;
    const clientSecret: string | undefined =
      req.app.locals.telegram_client_secret;

    if (!clientId || !clientSecret) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Telegram OIDC not configured (TELEGRAM_CLIENT_ID or TELEGRAM_CLIENT_SECRET missing)",
      });
      return;
    }

    const reqBody = new URLSearchParams({
      code: body.code,
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: body.redirect_uri,
      code_verifier: body.code_verifier,
    });

    const response = await fetch(TELEGRAM_OIDC_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: reqBody.toString(),
      // @ts-expect-error -- Node.js undici dispatcher, not in standard RequestInit
      dispatcher: telegramAgent,
    });

    const data: {
      id_token?: string;
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

    if (!data.id_token) {
      res.status(400).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Telegram OIDC response missing id_token",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id_token: data.id_token,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to exchange Telegram token";
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: message,
    });
  }
}
