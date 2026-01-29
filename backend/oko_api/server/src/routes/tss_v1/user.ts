import type { Request, Response, Router } from "express";
import type {
  CheckEmailRequest,
  CheckEmailResponse,
  ReshareRequest,
  SignInResponse,
  SignInSilentlyResponse,
} from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import {
  ErrorResponseSchema,
  OAuthHeaderSchema,
  SuccessResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  CheckEmailRequestSchema,
  CheckEmailSuccessResponseSchema,
  ReshareRequestSchema,
  SignInRequestSchema,
  SignInSilentlySuccessResponseSchema,
  SignInSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import { Bytes } from "@oko-wallet/bytes";
import { registry } from "@oko-wallet/oko-api-openapi";

import {
  signIn,
  checkEmail,
  updateWalletKSNodesForReshare,
} from "@oko-wallet-api/api/tss/v1/user";
import { verifyUserToken } from "@oko-wallet-api/api/tss/keplr_auth";
import { tssActivateMiddleware } from "@oko-wallet-api/middleware/auth/tss_activate";
import {
  type OAuthAuthenticatedRequest,
  oauthMiddleware,
} from "@oko-wallet-api/middleware/auth/oauth";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

export function setUserV1Routes(router: Router) {
  registry.registerPath({
    method: "post",
    path: "/tss/v1/user/check",
    tags: ["TSS"],
    summary: "Check if email exists",
    description:
      "Checks if a user with the given email address exists in the database",
    security: [],
    request: {
      body: {
        required: true,
        content: {
          "application/json": {
            schema: CheckEmailRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully checked email existence",
        content: {
          "application/json": {
            schema: CheckEmailSuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request - Email is missing",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });
  router.post(
    "/user/check",
    async (
      req: Request<any, any, CheckEmailRequest>,
      res: Response<OkoApiResponse<CheckEmailResponse>>,
    ) => {
      const state = req.app.locals;

      const { email } = req.body;
      // @NOTE: default to google if auth_type is not provided
      const auth_type = (req.body.auth_type ?? "google") as AuthType;

      if (!email) {
        res.status(400).json({
          success: false,
          code: "INVALID_REQUEST",
          msg: "email is required",
        });
        return;
      }

      const checkEmailRes = await checkEmail(state.db, email, auth_type);
      if (checkEmailRes.success === false) {
        res
          .status(ErrorCodeMap[checkEmailRes.code] ?? 500) //
          .json(checkEmailRes);
        return;
      }

      res.status(200).json({
        success: true,
        data: checkEmailRes.data,
      });
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/user/signin",
    tags: ["TSS"],
    summary: "Sign in with OAuth",
    description:
      "Authenticates user using Google or Auth0 OAuth token and returns user information with JWT token",
    security: [{ oauthAuth: [] }],
    request: {
      headers: OAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: SignInRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully signed in",
        content: {
          "application/json": {
            schema: SignInSuccessResponseSchema,
          },
        },
      },
      401: {
        description:
          "Unauthorized - Invalid or missing OAuth token or auth_type",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Not Found - User or wallet not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });
  router.post(
    "/user/signin",
    oauthMiddleware,
    tssActivateMiddleware,
    async (
      req: OAuthAuthenticatedRequest,
      res: Response<OkoApiResponse<SignInResponse>, OAuthLocals>,
    ) => {
      const state = req.app.locals;
      const oauthUser = res.locals.oauth_user;
      const auth_type = oauthUser.type as AuthType;
      const user_identifier = oauthUser.user_identifier;

      if (!user_identifier) {
        res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          msg: "User email not found",
        });
        return;
      }

      const signInRes = await signIn(
        state.db,
        user_identifier,
        auth_type,
        {
          secret: state.jwt_secret,
          expires_in: state.jwt_expires_in,
        },
        state.logger,
        oauthUser.email,
        oauthUser.name,
        oauthUser.metadata,
      );
      if (signInRes.success === false) {
        res
          .status(ErrorCodeMap[signInRes.code] ?? 500) //
          .json(signInRes);
        return;
      }

      res.status(200).json({
        success: true,
        data: signInRes.data,
      });
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/user/signin_silently",
    tags: ["TSS"],
    summary: "Sign in silently with existing token",
    description:
      "Attempts to refresh an expired JWT token or validates an existing one",
    security: [],
    request: {
      headers: UserAuthHeaderSchema,
    },
    responses: {
      200: {
        description: "Successfully processed token",
        content: {
          "application/json": {
            schema: SignInSilentlySuccessResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - Invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });
  router.post(
    "/user/signin_silently",
    [tssActivateMiddleware],
    async (
      req: Request<any, any, {}>,
      res: Response<OkoApiResponse<SignInSilentlyResponse>>,
    ) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          code: "INVALID_REQUEST",
          msg: "Authorization header with Bearer token required",
        });
        return;
      }

      const token = authHeader.substring(7); // skip "Bearer "
      const state = req.app.locals;

      const verifyTokenRes = verifyUserToken({
        token,
        jwt_config: {
          secret: state.jwt_secret,
        },
      });

      if (!verifyTokenRes.success) {
        const { err } = verifyTokenRes;

        if (err.type === "expired") {
          const payload = err.payload;

          if (!payload.email || !payload.wallet_id) {
            res.status(401).json({
              success: false,
              code: "INVALID_AUTH_TOKEN",
              msg: "Unauthorized: Invalid token",
            });
            return;
          }

          const signInRes = await signIn(
            state.db,
            payload.email,
            "google",
            {
              secret: state.jwt_secret,
              expires_in: state.jwt_expires_in,
            },
            state.logger,
          );

          if (signInRes.success === false) {
            res.status(ErrorCodeMap[signInRes.code] ?? 500).json(signInRes);
            return;
          }

          res.status(200).json({
            success: true,
            data: { token: signInRes.data.token },
          });
          return;
        } else {
          res.status(401).json({
            success: false,
            code: "INVALID_REQUEST",
            msg: verifyTokenRes.err.toString(),
          });
          return;
        }
      } else {
        res.status(200).json({
          success: true,
          data: {
            token: null,
          },
        });
      }
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/user/reshare",
    tags: ["TSS"],
    summary: "Reshare wallet key shares",
    description:
      "Updates wallet key share nodes after unrecoverable data loss using provided reshared shares",
    security: [{ oauthAuth: [] }],
    request: {
      headers: OAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: ReshareRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Reshare request accepted",
        content: {
          "application/json": {
            schema: SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request body",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - Invalid or missing OAuth token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });

  router.post(
    "/user/reshare",
    oauthMiddleware,
    tssActivateMiddleware,
    async (
      req: OAuthAuthenticatedRequest<ReshareRequest>,
      res: Response<OkoApiResponse<void>, OAuthLocals>,
    ) => {
      const state = req.app.locals;
      const oauthUser = res.locals.oauth_user;
      const auth_type = oauthUser.type as AuthType;
      const user_identifier = oauthUser.user_identifier;
      const { public_key, reshared_key_shares } = req.body;

      if (!user_identifier) {
        res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          msg: "User identifier not found",
        });
        return;
      }

      const publicKeyRes = Bytes.fromHexString(public_key, 33);
      if (publicKeyRes.success === false) {
        res.status(400).json({
          success: false,
          code: "INVALID_REQUEST",
          msg: `Invalid public key: ${publicKeyRes.err}`,
        });
        return;
      }

      if (!reshared_key_shares?.length) {
        res.status(400).json({
          success: false,
          code: "INVALID_REQUEST",
          msg: "reshared_key_shares is required",
        });
        return;
      }

      const reshareRes = await updateWalletKSNodesForReshare(
        state.db,
        user_identifier,
        auth_type,
        publicKeyRes.data,
        reshared_key_shares,
      );

      if (reshareRes.success === false) {
        res
          .status(ErrorCodeMap[reshareRes.code] ?? 500) //
          .json(reshareRes);
        return;
      }

      res.status(200).json({
        success: true,
        data: void 0,
      });
    },
  );
}
