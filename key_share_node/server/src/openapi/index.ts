import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

import { getOpenApiDocument } from "./doc";
import { logger } from "@oko-wallet-ksn-server/logger";

export function installSwaggerDocs(app: Express) {
  logger.debug("Installing Swagger with Zod");

  const openApiDoc = getOpenApiDocument();

  app.use(
    "/api_docs",
    swaggerUi.serve as any,
    swaggerUi.setup(openApiDoc) as any,
  );
}
