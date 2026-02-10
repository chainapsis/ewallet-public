import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  TriplesStep7RequestSchema,
  TriplesStep7SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep7Body,
  TriplesStep7Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runTriplesStep7 } from "@oko-wallet-api/api/tss/v1/triples";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

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

export async function triplesStep7(
  req: UserAuthenticatedRequest<TriplesStep7Body>,
  res: Response<OkoApiResponse<TriplesStep7Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const runTriplesStep7Res = await runTriplesStep7(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
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
}
