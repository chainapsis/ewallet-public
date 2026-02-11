import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  ApiKeyAndUserAuthHeaderSchema,
  TriplesStep1RequestSchema,
  TriplesStep1SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep1Body,
  TriplesStep1Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runTriplesStep1 } from "@oko-wallet-api/api/tss/v1/triples";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

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

export async function triplesStep1(
  req: UserAuthenticatedRequest<TriplesStep1Body>,
  res: Response<OkoApiResponse<TriplesStep1Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const apiKey = res.locals.api_key;
  const body = req.body;

  if (!user?.email || !user?.wallet_id_secp256k1) {
    res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "Unauthorized",
    });
    return;
  }

  const runTriplesStep1Res = await runTriplesStep1(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
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
}
