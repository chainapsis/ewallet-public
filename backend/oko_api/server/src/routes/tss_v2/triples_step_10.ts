import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  TriplesStep10RequestSchema,
  TriplesStep10SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep10Body,
  TriplesStep10Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runTriplesStep10 } from "@oko-wallet-api/api/tss/v1/triples";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

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

export async function triplesStep10(
  req: UserAuthenticatedRequest<TriplesStep10Body>,
  res: Response<OkoApiResponse<TriplesStep10Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const runTriplesStep10Res = await runTriplesStep10(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
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
}
