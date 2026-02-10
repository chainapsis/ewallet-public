import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  TriplesStep9RequestSchema,
  TriplesStep9SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep9Body,
  TriplesStep9Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runTriplesStep9 } from "@oko-wallet-api/api/tss/v1/triples";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

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

export async function triplesStep9(
  req: UserAuthenticatedRequest<TriplesStep9Body>,
  res: Response<OkoApiResponse<TriplesStep9Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const runTriplesStep9Res = await runTriplesStep9(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
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
}
