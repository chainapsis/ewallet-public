import { z } from "zod";

import { registry } from "../registry";

export const SocialLoginTelegramRequestSchema = registry.register(
  "SocialLoginTelegramRequest",
  z.object({
    code: z.string().openapi({
      description: "Authorization code from Telegram OIDC",
    }),
    code_verifier: z.string().openapi({
      description: "PKCE code verifier",
    }),
    redirect_uri: z.string().openapi({
      description: "Redirect URI used in OAuth flow",
    }),
  }),
);

const SocialLoginTelegramResponseSchema = registry.register(
  "SocialLoginTelegramResponse",
  z.object({
    id_token: z.string().openapi({
      description: "ID token (JWT) issued by Telegram OIDC",
    }),
  }),
);

export const SocialLoginTelegramSuccessResponseSchema = registry.register(
  "SocialLoginTelegramSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: SocialLoginTelegramResponseSchema,
  }),
);
