import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  PresignStep1RequestSchema,
  PresignStep1SuccessResponseSchema,
  PresignStep2RequestSchema,
  PresignStep2SuccessResponseSchema,
  PresignStep3RequestSchema,
  PresignStep3SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  PresignStep1Body,
  PresignStep1Response,
  PresignStep2Body,
  PresignStep2Response,
  PresignStep3Body,
  PresignStep3Response,
} from "@oko-wallet/oko-types/tss";
import type { Response, Router } from "express";

import {
  runPresignStep1,
  runPresignStep2,
  runPresignStep3,
} from "@oko-wallet-api/api/tss/v1/presign";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
  userJwtMiddleware,
} from "@oko-wallet-api/middleware/auth/keplr_auth";
import { tssActivateMiddleware } from "@oko-wallet-api/middleware/auth/tss_activate";

export function setPresignV1Routes(router: Router) {
  registry.registerPath({
    method: "post",
    path: "/tss/v1/presign/step1",
    tags: ["TSS"],
    summary: "Initiate presign process using completed triples",
    description: "Creates presign stage and generates initial presign messages",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: PresignStep1RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully initialized presign generation",
        content: {
          "application/json": {
            schema: PresignStep1SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request - Session or stage validation failed",
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
    "/presign/step1",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<PresignStep1Body>,
      res: Response<OkoApiResponse<PresignStep1Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runPresignStep1Res = await runPresignStep1(
        state.db,
        {
          email: user.email,
          wallet_id: user.wallet_id,
          session_id: body.session_id,
          msgs_1: body.msgs_1,
        },
        state.encryption_secret,
      );
      if (runPresignStep1Res.success === false) {
        res
          .status(ErrorCodeMap[runPresignStep1Res.code] ?? 500)
          .json(runPresignStep1Res);

        return;
      }

      sendResponseWithNewToken(res, runPresignStep1Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/presign/step2",
    tags: ["TSS"],
    summary: "Execute step 2 of presign process",
    description: "Processes wait messages and updates presign stage",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: PresignStep2RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 2",
        content: {
          "application/json": {
            schema: PresignStep2SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request - Session or stage validation failed",
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
    "/presign/step2",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<PresignStep2Body>,
      res: Response<OkoApiResponse<PresignStep2Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runPresignStep2Res = await runPresignStep2(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        wait_1_0_1: body.wait_1_0_1,
      });
      if (runPresignStep2Res.success === false) {
        res
          .status(ErrorCodeMap[runPresignStep2Res.code] ?? 500)
          .json(runPresignStep2Res);

        return;
      }

      sendResponseWithNewToken(res, runPresignStep2Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/presign/step3",
    tags: ["TSS"],
    summary: "Execute step 3 of presign process",
    description: "Finalizes presign stage",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: PresignStep3RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Presign process completed successfully",
        content: {
          "application/json": {
            schema: PresignStep3SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request - Session, stage, or result invalid",
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
    "/presign/step3",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<PresignStep3Body>,
      res: Response<OkoApiResponse<PresignStep3Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runPresignStep3Res = await runPresignStep3(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        presign_big_r: body.presign_big_r,
      });
      if (runPresignStep3Res.success === false) {
        res
          .status(ErrorCodeMap[runPresignStep3Res.code] ?? 500)
          .json(runPresignStep3Res);

        return;
      }

      sendResponseWithNewToken(res, runPresignStep3Res.data);
    },
  );
}
