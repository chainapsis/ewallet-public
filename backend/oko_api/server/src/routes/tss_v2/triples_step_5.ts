import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  TriplesStep5RequestSchema,
  TriplesStep5SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep5Body,
  TriplesStep5Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runTriplesStep5 } from "@oko-wallet-api/api/tss/v1/triples";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

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

export async function triplesStep5(
  req: UserAuthenticatedRequest<TriplesStep5Body>,
  res: Response<OkoApiResponse<TriplesStep5Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const runTriplesStep5Res = await runTriplesStep5(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
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
}
