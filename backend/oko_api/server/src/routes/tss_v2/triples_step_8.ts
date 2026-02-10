import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  TriplesStep8RequestSchema,
  TriplesStep8SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep8Body,
  TriplesStep8Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runTriplesStep8 } from "@oko-wallet-api/api/tss/v1/triples";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

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

export async function triplesStep8(
  req: UserAuthenticatedRequest<TriplesStep8Body>,
  res: Response<OkoApiResponse<TriplesStep8Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const runTriplesStep8Res = await runTriplesStep8(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
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
}
