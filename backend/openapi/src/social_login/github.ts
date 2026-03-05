import { z } from "zod";

import { registry } from "../registry";

export const GithubAuthHeaderSchema = z.object({
  Authorization: z.string().openapi({
    description: "GitHub access token as Bearer token",
    example: "Bearer gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    param: {
      name: "Authorization",
      in: "header",
      required: true,
    },
  }),
});

export const SocialLoginGithubRequestSchema = registry.register(
  "SocialLoginGithubRequest",
  z.object({
    code: z.string().openapi({
      description: "Authorization code from GitHub",
    }),
    code_verifier: z.string().openapi({
      description: "PKCE code verifier",
    }),
    redirect_uri: z.string().openapi({
      description: "Redirect URI used in OAuth flow",
    }),
  }),
);

const SocialLoginGithubResponseSchema = registry.register(
  "SocialLoginGithubResponse",
  z.object({
    access_token: z.string().openapi({
      description: "Access token issued by GitHub",
    }),
    refresh_token: z.string().optional().openapi({
      description: "Refresh token issued by GitHub (optional)",
    }),
    expires_in: z.number().int().optional().openapi({
      description: "Access token expiration time in seconds",
    }),
    token_type: z.string().optional().openapi({
      description: "Token type (typically 'bearer')",
    }),
    scope: z.string().optional().openapi({
      description: "Granted OAuth scopes",
    }),
  }),
);

export const SocialLoginGithubSuccessResponseSchema = registry.register(
  "SocialLoginGithubSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: SocialLoginGithubResponseSchema,
  }),
);

const SocialLoginGithubVerifyUserResponseSchema = registry.register(
  "SocialLoginGithubVerifyUserResponse",
  z.object({
    id: z.number().int().openapi({
      description: "GitHub user ID",
    }),
    login: z.string().openapi({
      description: "GitHub username",
    }),
    name: z.string().nullable().openapi({
      description: "User display name",
    }),
    email: z.string().nullable().openapi({
      description: "User email address (if provided by GitHub)",
    }),
    avatar_url: z.string().openapi({
      description: "User avatar URL",
    }),
  }),
);

export const SocialLoginGithubVerifyUserSuccessResponseSchema =
  registry.register(
    "SocialLoginGithubVerifyUserSuccessResponse",
    z.object({
      success: z.literal(true).openapi({
        description: "Indicates the request succeeded",
      }),
      data: SocialLoginGithubVerifyUserResponseSchema,
    }),
  );
