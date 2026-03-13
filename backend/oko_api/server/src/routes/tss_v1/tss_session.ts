import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  AbortTssSessionRequestSchema,
  AbortTssSessionSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  AbortTssSessionBody,
  AbortTssSessionResponse,
} from "@oko-wallet/oko-types/tss";
import type { Response, Router } from "express";

import { abortTssSession } from "@oko-wallet-api/api/tss/tss_session";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
  userJwtMiddleware,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

export function setTssSessionRoutes(router: Router) {
  registry.registerPath({
    method: "post",
    path: "/tss/v1/session/abort",
    tags: ["TSS"],
    summary: "Abort a TSS session",
    description: "Aborts a TSS session",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: AbortTssSessionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully aborted TSS session",
        content: {
          "application/json": {
            schema: AbortTssSessionSuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request or session state",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - Invalid or missing JWT token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "TSS session not found",
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
    "/session/abort",
    userJwtMiddleware,
    async (
      req: UserAuthenticatedRequest<AbortTssSessionBody>,
      res: Response<OkoApiResponse<AbortTssSessionResponse>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      if (!user?.email || !user?.wallet_id) {
        res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          msg: "Unauthorized",
        });
        return;
      }

      const { session_id } = body;
      if (!session_id) {
        res.status(400).json({
          success: false,
          code: "INVALID_REQUEST",
          msg: "Session id is required",
        });
        return;
      }

      const abortTssSessionRes = await abortTssSession(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: session_id,
      });
      if (abortTssSessionRes.success === false) {
        res
          .status(ErrorCodeMap[abortTssSessionRes.code] ?? 500)
          .json(abortTssSessionRes);
        return;
      }

      sendResponseWithNewToken(res, abortTssSessionRes.data);
    },
  );
}
