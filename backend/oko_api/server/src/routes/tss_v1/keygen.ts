import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  OAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  KeygenRequestSchema,
  SignInSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
// Service shutdown: signups blocked. Imports below are unused while the handler body is commented out. Re-enable together if restoring.
// import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { KeygenBody } from "@oko-wallet/oko-types/tss";
import type { SignInResponse } from "@oko-wallet/oko-types/user";
import type { Response, Router } from "express";

// import { runKeygen } from "@oko-wallet-api/api/tss/v1/keygen";
import { apiKeyMiddleware } from "@oko-wallet-api/middleware/auth/api_key_auth";
import {
  type OAuthAuthenticatedRequest,
  oauthMiddleware,
} from "@oko-wallet-api/middleware/auth/oauth";
import { tssActivateMiddleware } from "@oko-wallet-api/middleware/auth/tss_activate";
import type { OAuthLocalsWithAPIKey } from "@oko-wallet-api/middleware/auth/types";

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
    apiKeyMiddleware,
    oauthMiddleware,
    tssActivateMiddleware,
    async (
      _req: OAuthAuthenticatedRequest<KeygenBody>,
      res: Response<OkoApiResponse<SignInResponse>, OAuthLocalsWithAPIKey>,
    ) => {
      // Service shutdown: signups permanently blocked. To restore, remove this response block and uncomment the block below.
      res.status(ErrorCodeMap.SIGNUP_DISABLED).json({
        success: false,
        code: "SIGNUP_DISABLED",
        msg: "New signups are disabled as the service is winding down.",
      });
      return;

      /* === Disabled due to service shutdown. Uncomment to restore. ===
      const state = _req.app.locals;
      const apiKey = res.locals.api_key;
      const oauthUser = res.locals.oauth_user;
      const auth_type = oauthUser.type as AuthType;
      const user_identifier = oauthUser.user_identifier;
      const body = _req.body;

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
        apiKey.customer_id,
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
      */
    },
  );
}
