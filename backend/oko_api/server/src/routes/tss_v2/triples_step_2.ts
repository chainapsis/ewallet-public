import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  TriplesStep2RequestSchema,
  TriplesStep2SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep2Body,
  TriplesStep2Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runTriplesStep2 } from "@oko-wallet-api/api/tss/v1/triples";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

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

export async function triplesStep2(
  req: UserAuthenticatedRequest<TriplesStep2Body>,
  res: Response<OkoApiResponse<TriplesStep2Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  if (!user?.email || !user?.wallet_id_secp256k1) {
    res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "Unauthorized",
    });
    return;
  }

  const runTriplesStep2Res = await runTriplesStep2(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
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
}
