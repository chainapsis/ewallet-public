import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  TriplesStep4RequestSchema,
  TriplesStep4SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep4Body,
  TriplesStep4Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runTriplesStep4 } from "@oko-wallet-api/api/tss/v1/triples";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

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

export async function triplesStep4(
  req: UserAuthenticatedRequest<TriplesStep4Body>,
  res: Response<OkoApiResponse<TriplesStep4Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const runTriplesStep4Res = await runTriplesStep4(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
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
}
