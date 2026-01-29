import type { Response, Router } from "express";
import type { KeygenBody } from "@oko-wallet/oko-types/tss";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { SignInResponse } from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  ErrorResponseSchema,
  OAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import { SignInSuccessResponseSchema } from "@oko-wallet/oko-api-openapi/tss";
import { registry } from "@oko-wallet/oko-api-openapi";
import { KeygenRequestSchema } from "@oko-wallet/oko-api-openapi/tss";

import { runKeygen } from "@oko-wallet-api/api/tss/v1/keygen";
import {
  type OAuthAuthenticatedRequest,
  oauthMiddleware,
} from "@oko-wallet-api/middleware/auth/oauth";
import { tssActivateMiddleware } from "@oko-wallet-api/middleware/auth/tss_activate";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

export function setKeygenV1Routes(router: Router) {
  registry.registerPath({
    method: "post",
    path: "/tss/v1/keygen",
    tags: ["TSS"],
    summary: "Run keygen to generate TSS key pair",
    description:
      "Creates user and wallet entities by mapping the received key share \
    with the user's email",
    security: [{ oauthAuth: [] }],
    request: {
      headers: OAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: KeygenRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully created user and wallet entities",
        content: {
          "application/json": {
            schema: SignInSuccessResponseSchema,
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
      409: {
        description:
          "Conflict - Email already exists or public key already in use",
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
    "/keygen",
    oauthMiddleware,
    tssActivateMiddleware,
    async (
      req: OAuthAuthenticatedRequest<KeygenBody>,
      res: Response<OkoApiResponse<SignInResponse>, OAuthLocals>,
    ) => {
      const state = req.app.locals;
      const oauthUser = res.locals.oauth_user;
      const auth_type = oauthUser.type as AuthType;
      const user_identifier = oauthUser.user_identifier;
      const body = req.body;

      if (!user_identifier) {
        res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          msg: "User identifier not found",
        });
        return;
      }

      const jwtConfig = {
        secret: state.jwt_secret,
        expires_in: state.jwt_expires_in,
      };

      const runKeygenRes = await runKeygen(
        state.db,
        jwtConfig,
        {
          auth_type,
          user_identifier,
          keygen_2: body.keygen_2,
          email: oauthUser.email,
          name: oauthUser.name,
          metadata: oauthUser.metadata,
        },
        state.encryption_secret,
        state.logger,
      );

      if (runKeygenRes.success === false) {
        res.status(ErrorCodeMap[runKeygenRes.code] ?? 500).json(runKeygenRes);
        return;
      }

      res.status(200).json({
        success: true,
        data: runKeygenRes.data,
      });
      return;
    },
  );
}
