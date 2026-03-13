import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "adminAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Admin bearer token. Use: 'Authorization: Bearer <JWT>'",
});

registry.registerComponent("securitySchemes", "customerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "Customer dashboard bearer token. Use: 'Authorization: Bearer <JWT>'",
});

registry.registerComponent("securitySchemes", "userAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "End-user bearer token. Use: 'Authorization: Bearer <JWT>'",
});

registry.registerComponent("securitySchemes", "oauthAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "OAuth bearer token (Google or Auth0). Use: 'Authorization: Bearer <JWT>'",
});

registry.registerComponent("securitySchemes", "apiKeyAuth", {
  type: "apiKey",
  in: "header",
  name: "x-api-key",
  description: "Customer API key header. Use: 'x-api-key: <key>'",
});

export function getOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Oko API documentation",
      version: "0.0.1",
      description: "Oko API documentation",
    },
    servers: [
      {
        url: "http://localhost:4200",
        description: "Development server",
      },
      {
        url: "http://localhost:4200",
        description: "Production server",
      },
    ],
    tags: [{ name: "TSS" }, { name: "Customer Dashboard" }, { name: "Admin" }],
  });
}
