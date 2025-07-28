import path from "path";
import { fileURLToPath } from "url";
import swaggerJSDoc, { type SwaggerDefinition } from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { type Express } from "express";

import { schemas } from "./schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apis = (function () {
  const credentialVaultApi = path.resolve(__dirname, "../routes/**/*.ts");

  const paths = [credentialVaultApi];

  return paths;
})();

const swaggerDefinition: SwaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Credential Vault API documentation",
    version: "0.0.1",
    description: "Credential Vault API documentation",
  },
  servers: [
    {
      url: "http://localhost:4201",
      description: "Development server",
    },
    {
      url: "http://localhost:4201",
      description: "Production server",
    },
  ],
  tags: [{ name: "Key Share" }],
  components: {
    schemas,
  },
};

export function installSwaggerDocs(app: Express) {
  console.log("Installing Swagger docs, apis: %j", apis);

  const options = {
    swaggerDefinition,
    // Path to the API docs (for swagger-jsdoc to parse)
    apis,
  };

  const swaggerSpec = swaggerJSDoc(options);

  app.use(
    "/api_docs",
    swaggerUi.serve as any,
    swaggerUi.setup(swaggerSpec) as any,
  );
}
