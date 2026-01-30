import { z } from "zod";
import { registry } from "@oko-wallet/oko-api-openapi";

export const OperationTypeSchema = z
  .enum(["sign_in", "sign_up", "sign_in_reshare", "add_ed25519"])
  .describe("Operation type for commit-reveal session");

// POST /tss/v2/commit-reveal/commit

export const CommitRequestBodySchema = registry.register(
  "CommitRevealCommitRequestBody",
  z
    .object({
      session_id: z
        .string()
        .uuid()
        .describe("Client-generated session ID (UUIDv4)")
        .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
      operation_type: OperationTypeSchema,
      client_ephemeral_pubkey: z
        .string()
        .length(64)
        .describe("Client ephemeral public key (32 bytes hex)")
        .openapi({
          example:
            "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd",
        }),
      id_token_hash: z
        .string()
        .length(64)
        .describe("SHA-256 hash of (auth_type | id_token) (32 bytes hex)")
        .openapi({
          example:
            "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        }),
    })
    .openapi("CommitRevealCommitRequestBody", {
      description: "Request payload for creating a commit-reveal session.",
    }),
);

export const CommitResponseDataSchema = registry.register(
  "CommitRevealCommitResponseData",
  z
    .object({
      node_pubkey: z
        .string()
        .length(64)
        .describe("Node's public key (32 bytes hex)")
        .openapi({
          example:
            "b2c3d4e5f67890123456789012345678901234567890123456789012345678ef",
        }),
      node_signature: z
        .string()
        .length(128)
        .describe("Node's signature on node_pubkey (64 bytes hex)")
        .openapi({
          example:
            "c3d4e5f6789012345678901234567890123456789012345678901234567890abc3d4e5f6789012345678901234567890123456789012345678901234567890ab",
        }),
    })
    .openapi("CommitRevealCommitResponseData", {
      description: "Response data containing node's public key and signature.",
    }),
);

export const CommitSuccessResponseSchema = registry.register(
  "CommitRevealCommitSuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: CommitResponseDataSchema,
    })
    .openapi("CommitRevealCommitSuccessResponse", {
      description: "Success response for commit request.",
    }),
);

export type CommitRequestBody = z.infer<typeof CommitRequestBodySchema>;
export type CommitResponseData = z.infer<typeof CommitResponseDataSchema>;

// Commit-reveal request fields (used by protected endpoints)

export const CommitRevealRequestFieldsSchema = z.object({
  cr_session_id: z
    .string()
    .uuid()
    .describe("Commit-reveal session ID from commit API")
    .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
  cr_signature: z
    .string()
    .length(128)
    .describe(
      "Client signature: sign(node_pubkey + session_id + auth_type + id_token + operation_type + api_name) (64 bytes hex)",
    )
    .openapi({
      example:
        "c3d4e5f6789012345678901234567890123456789012345678901234567890abc3d4e5f6789012345678901234567890123456789012345678901234567890ab",
    }),
  auth_type: z
    .string()
    .optional()
    .describe("Authentication type (defaults to 'google')")
    .openapi({ example: "google" }),
});
