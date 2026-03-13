import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { rateLimitMiddleware } from "@oko-wallet-ksn-server/middlewares";
import { installSwaggerDocs } from "@oko-wallet-ksn-server/openapi";
import { registry } from "@oko-wallet-ksn-server/openapi/doc";
import { OkResponseSchema } from "@oko-wallet-ksn-server/openapi/schema";
import { setRoutes } from "@oko-wallet-ksn-server/routes";

export function makeApp() {
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
  app.use(cors());
  app.use(express.json());

  app.use(
    rateLimitMiddleware({
      windowSeconds: 60,
      maxRequests: 100,
    }),
  );

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
            schema: OkResponseSchema,
          },
        },
      },
    },
  });
  // biome-ignore lint/complexity/noBannedTypes: Express standard generic pattern
  app.get<{}, string>("/", async (_req, res) => {
    res.send("Ok");
  });

  setRoutes(app);

  installSwaggerDocs(app);

  return app;
}
