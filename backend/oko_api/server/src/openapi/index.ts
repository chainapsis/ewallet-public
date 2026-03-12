import { getOpenApiDocument } from "@oko-wallet/oko-api-openapi";
import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

export function installSwaggerDocs(app: Express) {
  console.log("Installing Swagger with Zod");

  const openApiDoc = getOpenApiDocument();

  app.use(
    "/api_docs",
    swaggerUi.serve as any,
    swaggerUi.setup(openApiDoc) as any,
  );
}
