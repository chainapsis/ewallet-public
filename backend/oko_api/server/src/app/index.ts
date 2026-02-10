import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import type { ServerState } from "@oko-wallet/oko-api-server-state";

import { setRoutes } from "@oko-wallet-api/routes";
import { installSwaggerDocs } from "@oko-wallet-api/openapi";
import { loggingMiddleware } from "@oko-wallet-api/middleware/logging";
import { registry } from "@oko-wallet/oko-api-openapi";
import { OkoApiRootResponseSchema } from "@oko-wallet/oko-api-openapi/oko";

export function makeApp(state: ServerState) {
  const app = express();

  app.use(morgan("dev"));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          upgradeInsecureRequests: null,
        },
      },
    }),
  );

  app.use(
    cors({
      exposedHeaders: ["X-New-Token"],
    }),
  );

  // Make req.ip the nearest reverse-proxy ip address
  app.set("trust proxy", 1);

  // Exclude typeform webhook from JSON parsing (needs raw body for signature verification)
  app.use((req, res, next) => {
    if (req.path === "/oko_admin/v1/customer/create_customer_by_typeform") {
      return next();
    }
    express.json({ limit: "10mb" })(req, res, next);
  });

  app.locals = state;
  app.use(loggingMiddleware());
  registry.registerPath({
    method: "get",
    path: "/",
    tags: ["Status"],
    summary: "Health check",
    description: "Returns service health status",
    responses: {
      200: {
        description: "Service is healthy",
        content: {
          "text/plain": {
            schema: OkoApiRootResponseSchema,
          },
        },
      },
    },
  });
  app.get<{}, string>("/", (_, res) => {
    res.send("Ok");
  });

  setRoutes(app);

  // Should be called after registering all the components
  installSwaggerDocs(app);

  return app;
}
