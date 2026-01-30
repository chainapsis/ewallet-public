import type { Response, Request } from "express";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { PostLogBody, PostLogResponse } from "@oko-wallet/oko-types/log";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  PostLogRequestSchema,
  PostLogSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/log";

import { ingestLog } from "@oko-wallet-api/api/log";

registry.registerPath({
  method: "post",
  path: "/log/v1",
  tags: ["Log"],
  summary: "Ingest client log",
  description: "Ingests client log payload for storage",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: PostLogRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Log ingested successfully",
      content: {
        "application/json": {
          schema: PostLogSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid log payload",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export async function postLog(
  req: Request<any, any, PostLogBody>,
  res: Response<OkoApiResponse<PostLogResponse>>,
) {
  const logger = req.app.locals.logger;

  const ingestLogRes = ingestLog(req.body, logger);
  if (ingestLogRes.success === false) {
    return res.status(ErrorCodeMap[ingestLogRes.code]).json(ingestLogRes);
  }
  return res.status(200).json({
    success: true,
    data: ingestLogRes.data,
  });
}
