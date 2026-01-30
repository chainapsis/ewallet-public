import {
  OpenAPIRegistry,
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "oauthAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "OAuth bearer token (Google or Auth0)",
});

export function getOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Key Share Node API documentation",
      version: "0.0.1",
      description: "Key Share Node API documentation",
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
    tags: [
      { name: "Commit-Reveal" },
      { name: "Key Share" },
      { name: "PG Dump" },
    ],
  });
}
