import { z } from "zod";

import { registry } from "../doc";

export const authTypeSchema = z
  .enum(["google", "auth0", "x", "telegram", "discord", "github"])
  .describe("Authentication provider type")
  .openapi({ example: "google" });

export const curveTypeSchema = z
  .enum(["secp256k1", "ed25519"])
  .describe("The curve type for the key share");

export const publicKeySchema = z
  .string()
  .describe("Public key in hex string format")
  .openapi({ example: "3fa1c7e8b42d9f50c6e2a8749db1fe23" });

export const shareSchema = z
  .string()
  .describe("User key share")
  .openapi({ example: "8c5e2d17ab9034f65d1c3b7a29ef4d88" });

export const RegisterKeyShareBodySchema = registry.register(
  "RegisterKeyShareBody",
  z
    .object({
      auth_type: authTypeSchema,
      curve_type: curveTypeSchema,
      public_key: publicKeySchema,
      share: shareSchema,
    })
    .openapi("RegisterKeyShareBody", {
      description: "Request payload for registering a new key share.",
    }),
);

export const GetKeyShareRequestBodySchema = registry.register(
  "GetKeyShareRequestBody",
  z
    .object({
      auth_type: authTypeSchema,
      curve_type: curveTypeSchema,
      public_key: publicKeySchema,
    })
    .openapi("GetKeyShareRequestBody", {
      description: "Request payload for retrieving an existing key share.",
    }),
);

export const GetKeyShareResponseSchema = registry.register(
  "GetKeyShareResponse",
  z
    .object({
      share_id: z
        .uuid()
        .describe("Unique identifier for the key share")
        .openapi({ example: "3c98f82a-4ec6-4de4-9d8f-1e2b4a8d5c3f" }),
      share: shareSchema,
    })
    .openapi("GetKeyShareResponse", {
      description: "Response payload containing the decrypted key share.",
    }),
);

export const CheckKeyShareRequestBodySchema = registry.register(
  "CheckKeyShareRequestBody",
  z
    .object({
      user_auth_id: z
        .string()
        .describe("User authentication ID")
        .openapi({ example: "test@example.com" }),
      auth_type: authTypeSchema.optional().default("google"),
      curve_type: curveTypeSchema,
      public_key: publicKeySchema,
    })
    .openapi("CheckKeyShareRequestBody", {
      description: "Request payload for verifying if a key share exists.",
    }),
);

export const CheckKeyShareResponseSchema = registry.register(
  "CheckKeyShareResponse",
  z
    .object({
      exists: z
        .boolean()
        .describe("Whether the key share exists")
        .openapi({ example: true }),
    })
    .openapi("CheckKeyShareResponse", {
      description: "Response payload indicating if the key share exists.",
    }),
);

export const ReshareKeyShareBodySchema = registry.register(
  "ReshareKeyShareBody",
  z
    .object({
      auth_type: authTypeSchema,
      curve_type: curveTypeSchema,
      public_key: publicKeySchema,
      share: shareSchema.describe(
        "User key share (creates new or updates existing)",
      ),
    })
    .openapi("ReshareKeyShareBody", {
      description: "Request payload for resharing an existing key share.",
    }),
);

export const KeyShareEmptySuccessResponseSchema = registry.register(
  "KeyShareEmptySuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: z.null(),
    })
    .openapi("KeyShareEmptySuccessResponse", {
      description: "Standard success response with no payload.",
    }),
);

export const GetKeyShareSuccessResponseSchema = registry.register(
  "GetKeyShareSuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: GetKeyShareResponseSchema,
    })
    .openapi("GetKeyShareSuccessResponse", {
      description: "Success response containing the decrypted key share.",
    }),
);

export const CheckKeyShareSuccessResponseSchema = registry.register(
  "CheckKeyShareSuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: CheckKeyShareResponseSchema,
    })
    .openapi("CheckKeyShareSuccessResponse", {
      description: "Success response indicating whether the key share exists.",
    }),
);
