import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  ApiKeyAndUserAuthHeaderSchema,
  TriplesStep1RequestSchema,
  TriplesStep1SuccessResponseSchema,
  TriplesStep2RequestSchema,
  TriplesStep2SuccessResponseSchema,
  TriplesStep3RequestSchema,
  TriplesStep3SuccessResponseSchema,
  TriplesStep4RequestSchema,
  TriplesStep4SuccessResponseSchema,
  TriplesStep5RequestSchema,
  TriplesStep5SuccessResponseSchema,
  TriplesStep6RequestSchema,
  TriplesStep6SuccessResponseSchema,
  TriplesStep7RequestSchema,
  TriplesStep7SuccessResponseSchema,
  TriplesStep8RequestSchema,
  TriplesStep8SuccessResponseSchema,
  TriplesStep9RequestSchema,
  TriplesStep9SuccessResponseSchema,
  TriplesStep10RequestSchema,
  TriplesStep10SuccessResponseSchema,
  TriplesStep11RequestSchema,
  TriplesStep11SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep1Body,
  TriplesStep1Response,
  TriplesStep2Body,
  TriplesStep2Response,
  TriplesStep3Body,
  TriplesStep3Response,
  TriplesStep4Body,
  TriplesStep4Response,
  TriplesStep5Body,
  TriplesStep5Response,
  TriplesStep6Body,
  TriplesStep6Response,
  TriplesStep7Body,
  TriplesStep7Response,
  TriplesStep8Body,
  TriplesStep8Response,
  TriplesStep9Body,
  TriplesStep9Response,
  TriplesStep10Body,
  TriplesStep10Response,
  TriplesStep11Body,
  TriplesStep11Response,
} from "@oko-wallet/oko-types/tss";
import type { Response, Router } from "express";

import {
  runTriplesStep1,
  runTriplesStep2,
  runTriplesStep3,
  runTriplesStep4,
  runTriplesStep5,
  runTriplesStep6,
  runTriplesStep7,
  runTriplesStep8,
  runTriplesStep9,
  runTriplesStep10,
  runTriplesStep11,
} from "@oko-wallet-api/api/tss/v1/triples";
import { apiKeyMiddleware } from "@oko-wallet-api/middleware/auth/api_key_auth";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
  userJwtMiddleware,
} from "@oko-wallet-api/middleware/auth/keplr_auth";
import { tssActivateMiddleware } from "@oko-wallet-api/middleware/auth/tss_activate";

export function setTriplesV1Routes(router: Router) {
  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step1",
    tags: ["TSS"],
    summary: "Initiate triples generation process",
    description:
      "Creates a new TSS session and starts the triples generation process",
    security: [{ apiKeyAuth: [], userAuth: [] }],
    request: {
      headers: ApiKeyAndUserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep1RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully initialized triples generation",
        content: {
          "application/json": {
            schema: TriplesStep1SuccessResponseSchema,
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
    "/triples/step1",
    [apiKeyMiddleware, userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep1Body>,
      res: Response<OkoApiResponse<TriplesStep1Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const apiKey = res.locals.api_key;
      const body = req.body;

      if (!user?.email || !user?.wallet_id) {
        res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          msg: "Unauthorized",
        });
        return;
      }

      const runTriplesStep1Res = await runTriplesStep1(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        customer_id: apiKey.customer_id,
        msgs_1: body.msgs_1,
      });
      if (runTriplesStep1Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep1Res.code] ?? 500)
          .json(runTriplesStep1Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep1Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step2",
    tags: ["TSS"],
    summary: "Execute step 2 of triples generation",
    description: "Processes wait_1 messages and updates triples stage",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep2RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 2",
        content: {
          "application/json": {
            schema: TriplesStep2SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step2",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep2Body>,
      res: Response<OkoApiResponse<TriplesStep2Response>>,
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

      const runTriplesStep2Res = await runTriplesStep2(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        wait_1: body.wait_1,
      });
      if (runTriplesStep2Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep2Res.code] ?? 500)
          .json(runTriplesStep2Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep2Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step3",
    tags: ["TSS"],
    summary: "Execute step 3 of triples generation",
    description: "Processes wait_2 messages and updates triples stage",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep3RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 3",
        content: {
          "application/json": {
            schema: TriplesStep3SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step3",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep3Body>,
      res: Response<OkoApiResponse<TriplesStep3Response>>,
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

      const runTriplesStep3Res = await runTriplesStep3(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        wait_2: body.wait_2,
      });
      if (runTriplesStep3Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep3Res.code] ?? 500)
          .json(runTriplesStep3Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep3Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step4",
    tags: ["TSS"],
    summary: "Execute step 4 of triples generation",
    description: "Processes wait_3 messages and updates triples stage",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep4RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 4",
        content: {
          "application/json": {
            schema: TriplesStep4SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step4",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep4Body>,
      res: Response<OkoApiResponse<TriplesStep4Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runTriplesStep4Res = await runTriplesStep4(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        wait_3: body.wait_3,
      });
      if (runTriplesStep4Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep4Res.code] ?? 500)
          .json(runTriplesStep4Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep4Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step5",
    tags: ["TSS"],
    summary: "Execute step 5 of triples generation",
    description: "Processes wait_4 messages and updates triples stage",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep5RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 5",
        content: {
          "application/json": {
            schema: TriplesStep5SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step5",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep5Body>,
      res: Response<OkoApiResponse<TriplesStep5Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runTriplesStep5Res = await runTriplesStep5(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        wait_4: body.wait_4,
      });
      if (runTriplesStep5Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep5Res.code] ?? 500)
          .json(runTriplesStep5Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep5Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step6",
    tags: ["TSS"],
    summary: "Execute step 6 of triples generation",
    description: "Processes batch random OT messages",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep6RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 6",
        content: {
          "application/json": {
            schema: TriplesStep6SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step6",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep6Body>,
      res: Response<OkoApiResponse<TriplesStep6Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runTriplesStep6Res = await runTriplesStep6(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        batch_random_ot_wait_0: body.batch_random_ot_wait_0,
      });
      if (runTriplesStep6Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep6Res.code] ?? 500)
          .json(runTriplesStep6Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep6Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step7",
    tags: ["TSS"],
    summary: "Execute step 7 of triples generation",
    description: "Processes correlated OT payload",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep7RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 7",
        content: {
          "application/json": {
            schema: TriplesStep7SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step7",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep7Body>,
      res: Response<OkoApiResponse<TriplesStep7Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runTriplesStep7Res = await runTriplesStep7(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        correlated_ot_wait_0: body.correlated_ot_wait_0,
      });
      if (runTriplesStep7Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep7Res.code] ?? 500)
          .json(runTriplesStep7Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep7Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step8",
    tags: ["TSS"],
    summary: "Execute step 8 of triples generation",
    description: "Processes random OT extension payload",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep8RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 8",
        content: {
          "application/json": {
            schema: TriplesStep8SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step8",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep8Body>,
      res: Response<OkoApiResponse<TriplesStep8Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runTriplesStep8Res = await runTriplesStep8(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        random_ot_extension_wait_1: body.random_ot_extension_wait_1,
      });
      if (runTriplesStep8Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep8Res.code] ?? 500)
          .json(runTriplesStep8Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep8Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step9",
    tags: ["TSS"],
    summary: "Execute step 9 of triples generation",
    description: "Processes MTA wait_1 payload",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep9RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 9",
        content: {
          "application/json": {
            schema: TriplesStep9SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step9",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep9Body>,
      res: Response<OkoApiResponse<TriplesStep9Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runTriplesStep9Res = await runTriplesStep9(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        mta_wait_1: body.mta_wait_1,
      });
      if (runTriplesStep9Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep9Res.code] ?? 500)
          .json(runTriplesStep9Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep9Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step10",
    tags: ["TSS"],
    summary: "Execute step 10 of triples generation",
    description: "Processes wait_5 and wait_6 payloads",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep10RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully processed step 10",
        content: {
          "application/json": {
            schema: TriplesStep10SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step10",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep10Body>,
      res: Response<OkoApiResponse<TriplesStep10Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runTriplesStep10Res = await runTriplesStep10(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        wait_5: body.wait_5,
        wait_6: body.wait_6,
      });
      if (runTriplesStep10Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep10Res.code] ?? 500)
          .json(runTriplesStep10Res);

        return;
      }

      sendResponseWithNewToken(res, runTriplesStep10Res.data);
    },
  );

  registry.registerPath({
    method: "post",
    path: "/tss/v1/triples/step11",
    tags: ["TSS"],
    summary: "Execute step 11 of triples generation",
    description: "Finalizes triples and returns public triples",
    security: [{ userAuth: [] }],
    request: {
      headers: UserAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: TriplesStep11RequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully completed triples generation",
        content: {
          "application/json": {
            schema: TriplesStep11SuccessResponseSchema,
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
      401: {
        description: "Unauthorized",
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
    "/triples/step11",
    [userJwtMiddleware, tssActivateMiddleware],
    async (
      req: UserAuthenticatedRequest<TriplesStep11Body>,
      res: Response<OkoApiResponse<TriplesStep11Response>>,
    ) => {
      const state = req.app.locals;
      const user = res.locals.user;
      const body = req.body;

      const runTriplesStep11Res = await runTriplesStep11(state.db, {
        email: user.email,
        wallet_id: user.wallet_id,
        session_id: body.session_id,
        pub_v: body.pub_v,
      });
      if (runTriplesStep11Res.success === false) {
        res
          .status(ErrorCodeMap[runTriplesStep11Res.code] ?? 500)
          .json(runTriplesStep11Res);
        return;
      }

      sendResponseWithNewToken(res, runTriplesStep11Res.data);
    },
  );
}
