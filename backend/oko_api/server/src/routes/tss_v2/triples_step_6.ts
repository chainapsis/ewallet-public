import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  TriplesStep6RequestSchema,
  TriplesStep6SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStep6Body,
  TriplesStep6Response,
} from "@oko-wallet/oko-types/tss";
import type { Response } from "express";

import { runTriplesStep6 } from "@oko-wallet-api/api/tss/v1/triples";
import {
  sendResponseWithNewToken,
  type UserAuthenticatedRequest,
} from "@oko-wallet-api/middleware/auth/keplr_auth";

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

export async function triplesStep6(
  req: UserAuthenticatedRequest<TriplesStep6Body>,
  res: Response<OkoApiResponse<TriplesStep6Response>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  const runTriplesStep6Res = await runTriplesStep6(state.db, {
    email: user.email,
    wallet_id: user.wallet_id_secp256k1,
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
}
