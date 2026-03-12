import { registry } from "@oko-wallet/oko-api-openapi";
import {
  KSNodeTelemetryRequestSchema,
  KSNodeTelemetryResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { KSNodeTelemetryRequest } from "@oko-wallet/oko-types/tss";
import type { Response, Router } from "express";
import { z } from "zod";

import { processKSNodeTelemetry } from "@oko-wallet-api/api/tss/ks_node/telemetry";

export function setKSNodeTelemetryRoutes(router: Router) {
  registry.registerPath({
    method: "post",
    path: "/tss/v1/ks_node/telemetry",
    tags: ["TSS"],
    summary: "Report Key Share Node Telemetry",
    description:
      "Allows Key Share Nodes to report their status and statistics (telemetry) to the OKO API.",
    request: {
      headers: z.object({
        "x-ks-node-password": z.string().openapi({
          description: "Password for authenticating the Key Share Node",
        }),
      }),
      body: {
        content: {
          "application/json": {
            schema: KSNodeTelemetryRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Telemetry reported successfully",
        content: {
          "application/json": {
            schema: KSNodeTelemetryResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request body",
      },
      401: {
        description: "Unauthorized (invalid password)",
      },
      500: {
        description: "Internal server error",
      },
    },
  });
  router.post(
    "/ks_node/telemetry",
    async (req, res: Response<OkoApiResponse<void>>) => {
      const password = req.headers["x-ks-node-password"];
      if (typeof password !== "string") {
        res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          msg: "Missing or invalid password header",
        });
        return;
      }

      const expectedPassword = req.app.locals.ks_node_report_password;
      if (password !== expectedPassword) {
        res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          msg: "Invalid password",
        });
        return;
      }

      const payload: KSNodeTelemetryRequest = req.body;
      if (
        !payload ||
        !payload.public_key ||
        payload.key_share_count === undefined
      ) {
        res.status(400).json({
          success: false,
          code: "INVALID_REQUEST",
          msg: "Missing required fields: public_key, key_share_count",
        });
        return;
      }

      const result = await processKSNodeTelemetry(
        req.app.locals.db,
        payload,
        req.app.locals.slack_webhook_url,
      );

      if (!result.success) {
        res.status(500).json({
          success: false,
          code: "UNKNOWN_ERROR",
          msg: result.err,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: void 0,
      });
    },
  );
}
