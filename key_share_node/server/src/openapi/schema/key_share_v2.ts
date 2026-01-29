import { z } from "zod";

import { authTypeSchema, publicKeySchema, shareSchema } from "./key_share_v1";
import { commitRevealRequestFieldsSchema } from "./commit_reveal";
import { registry } from "../doc";

// ============================================================================
// Shared Schemas
// ============================================================================

export const walletsRequestBodySchema = z
  .object({
    secp256k1: publicKeySchema
      .optional()
      .describe("secp256k1 public key (33 bytes hex)"),
    ed25519: publicKeySchema
      .optional()
      .describe("ed25519 public key (32 bytes hex)"),
  })
  .refine((data) => data.secp256k1 || data.ed25519, {
    message: "At least one of secp256k1 or ed25519 must be provided",
  });

// ============================================================================
// GET /v2/keyshare
// ============================================================================

export const GetKeyShareV2RequestBodySchema = registry.register(
  "GetKeyShareV2RequestBody",
  z
    .object({
      wallets: walletsRequestBodySchema.describe(
        "Object with curve_type as key and public_key as value",
      ),
    })
    .merge(commitRevealRequestFieldsSchema)
    .openapi("GetKeyShareV2RequestBody", {
      description:
        "Request payload for retrieving multiple key shares at once. Requires commit-reveal session.",
    }),
);

const walletResponseSchema = z.object({
  share_id: z
    .string()
    .uuid()
    .describe("Unique identifier for the key share")
    .openapi({ example: "3c98f82a-4ec6-4de4-9d8f-1e2b4a8d5c3f" }),
  share: shareSchema,
});

export const GetKeyShareV2ResponseSchema = registry.register(
  "GetKeyShareV2Response",
  z
    .object({
      secp256k1: walletResponseSchema.optional(),
      ed25519: walletResponseSchema.optional(),
    })
    .openapi("GetKeyShareV2Response", {
      description:
        "Response payload containing decrypted key shares by curve type.",
    }),
);

export const GetKeyShareV2SuccessResponseSchema = registry.register(
  "GetKeyShareV2SuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: GetKeyShareV2ResponseSchema,
    })
    .openapi("GetKeyShareV2SuccessResponse", {
      description: "Success response containing multiple decrypted key shares.",
    }),
);

// ============================================================================
// POST /v2/keyshare/check
// ============================================================================

export const CheckKeyShareV2RequestBodySchema = registry.register(
  "CheckKeyShareV2RequestBody",
  z
    .object({
      user_auth_id: z
        .string()
        .describe("User authentication ID")
        .openapi({ example: "test@example.com" }),
      auth_type: authTypeSchema,
      wallets: walletsRequestBodySchema.describe(
        "Object with curve_type as key and public_key as value",
      ),
    })
    .openapi("CheckKeyShareV2RequestBody", {
      description:
        "Request payload for checking existence of multiple key shares.",
    }),
);

const checkWalletResponseSchema = z.object({
  exists: z
    .boolean()
    .describe("Whether the key share exists")
    .openapi({ example: true }),
});

export const CheckKeyShareV2ResponseSchema = registry.register(
  "CheckKeyShareV2Response",
  z
    .object({
      secp256k1: checkWalletResponseSchema.optional(),
      ed25519: checkWalletResponseSchema.optional(),
    })
    .openapi("CheckKeyShareV2Response", {
      description:
        "Response payload indicating key share existence by curve type.",
    }),
);

export const CheckKeyShareV2SuccessResponseSchema = registry.register(
  "CheckKeyShareV2SuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: CheckKeyShareV2ResponseSchema,
    })
    .openapi("CheckKeyShareV2SuccessResponse", {
      description: "Success response indicating key share existence status.",
    }),
);

// ============================================================================
// POST /v2/keyshare/register
// ============================================================================

const walletRegisterInfoSchema = z.object({
  public_key: publicKeySchema.describe("Public key in hex string format"),
  share: shareSchema.describe("Key share in hex string format (64 bytes)"),
});

export const walletsRegisterRequestBodySchema = z.object({
  secp256k1: walletRegisterInfoSchema.describe(
    "secp256k1 wallet registration info (required)",
  ),
  ed25519: walletRegisterInfoSchema.describe(
    "ed25519 wallet registration info (required)",
  ),
});

export const RegisterKeyShareV2RequestBodySchema = registry.register(
  "RegisterKeyShareV2RequestBody",
  z
    .object({
      wallets: walletsRegisterRequestBodySchema.describe(
        "Both secp256k1 and ed25519 wallet info are required",
      ),
    })
    .merge(commitRevealRequestFieldsSchema)
    .openapi("RegisterKeyShareV2RequestBody", {
      description:
        "Request payload for registering key shares. Both secp256k1 and ed25519 wallets are required. Requires commit-reveal session.",
    }),
);

export const RegisterKeyShareV2SuccessResponseSchema = registry.register(
  "RegisterKeyShareV2SuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: z.null(),
    })
    .openapi("RegisterKeyShareV2SuccessResponse", {
      description: "Success response for key share registration.",
    }),
);

// ============================================================================
// POST /v2/keyshare/register/ed25519
// ============================================================================

export const RegisterEd25519V2RequestBodySchema = registry.register(
  "RegisterEd25519V2RequestBody",
  z
    .object({
      public_key: z
        .string()
        .length(64)
        .describe("ed25519 public key (32 bytes hex)"),
      share: shareSchema.describe("Key share in hex string format (64 bytes)"),
    })
    .merge(commitRevealRequestFieldsSchema)
    .openapi("RegisterEd25519V2RequestBody", {
      description:
        "Request payload for registering ed25519 wallet for existing users. Requires commit-reveal session.",
    }),
);

export const RegisterEd25519V2SuccessResponseSchema = registry.register(
  "RegisterEd25519V2SuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: z.null(),
    })
    .openapi("RegisterEd25519V2SuccessResponse", {
      description: "Success response for ed25519 wallet registration.",
    }),
);

// ============================================================================
// POST /v2/keyshare/reshare
// ============================================================================

const walletReshareInfoSchema = z.object({
  public_key: publicKeySchema.describe("Public key in hex string format"),
  share: shareSchema.describe("Key share in hex string format (64 bytes)"),
});

export const walletsReshareRequestBodySchema = z
  .object({
    secp256k1: walletReshareInfoSchema
      .optional()
      .describe("secp256k1 wallet reshare info"),
    ed25519: walletReshareInfoSchema
      .optional()
      .describe("ed25519 wallet reshare info"),
  })
  .refine((data) => data.secp256k1 || data.ed25519, {
    message: "At least one of secp256k1 or ed25519 must be provided",
  });

export const ReshareKeyShareV2RequestBodySchema = registry.register(
  "ReshareKeyShareV2RequestBody",
  z
    .object({
      wallets: walletsReshareRequestBodySchema.describe(
        "Object with curve_type as key and wallet reshare info as value",
      ),
    })
    .merge(commitRevealRequestFieldsSchema)
    .openapi("ReshareKeyShareV2RequestBody", {
      description:
        "Request payload for resharing multiple key shares at once. Requires commit-reveal session.",
    }),
);

export const ReshareKeyShareV2SuccessResponseSchema = registry.register(
  "ReshareKeyShareV2SuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: z.null(),
    })
    .openapi("ReshareKeyShareV2SuccessResponse", {
      description: "Success response for key share reshare.",
    }),
);

// ============================================================================
// POST /v2/keyshare/reshare/register
// ============================================================================

const walletsReshareRegisterRequestBodySchema = z
  .object({
    secp256k1: walletRegisterInfoSchema
      .optional()
      .describe("secp256k1 wallet registration info"),
    ed25519: walletRegisterInfoSchema
      .optional()
      .describe("ed25519 wallet registration info"),
  })
  .refine((data) => data.secp256k1 || data.ed25519, {
    message: "At least one of secp256k1 or ed25519 must be provided",
  });

export const ReshareRegisterV2RequestBodySchema = registry.register(
  "ReshareRegisterV2RequestBody",
  z
    .object({
      wallets: walletsReshareRegisterRequestBodySchema.describe(
        "Object with curve_type as key and wallet info as value",
      ),
    })
    .merge(commitRevealRequestFieldsSchema)
    .openapi("ReshareRegisterV2RequestBody", {
      description:
        "Request payload for registering key shares during reshare (new node joining). User must already exist. Requires commit-reveal session.",
    }),
);

export const ReshareRegisterV2SuccessResponseSchema = registry.register(
  "ReshareRegisterV2SuccessResponse",
  z
    .object({
      success: z.literal(true),
      data: z.null(),
    })
    .openapi("ReshareRegisterV2SuccessResponse", {
      description:
        "Success response for key share registration during reshare.",
    }),
);
