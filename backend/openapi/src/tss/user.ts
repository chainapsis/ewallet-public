import { z } from "zod";

import { registry } from "../registry";

const KsNodeStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);
const WalletStatusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "NOT_REGISTERED",
  "UNRECOVERABLE_DATA_LOSS",
]);
const ReshareReasonEnum = z.enum(["UNRECOVERABLE_NODE_DATA_LOSS"]);

export const SignInResponseSchema = registry.register(
  "TssUserSignInResponse",
  z.object({
    token: z.string().openapi({
      description: "JWT token for authentication",
    }),
    user: z
      .object({
        wallet_id: z.string().openapi({
          description: "Unique wallet identifier",
        }),
        public_key: z.string().openapi({
          description: "Public key in hex format",
        }),
        user_identifier: z.string().openapi({
          description: "User identifier",
        }),
        email: z.string().nullable().openapi({
          description: "User email address (nullable)",
        }),
        name: z.string().nullable().openapi({
          description:
            "User name (nullable) Only for OAuth providers that support it",
        }),
      })
      .openapi({ description: "Authenticated user information" }),
  }),
);

// export const SignInSuccessResponseSchema = makeSuccessResponseSchema(
//   SignInResponseSchema,
//   "TssUserSignInSuccessResponse",
// );
export const SignInSuccessResponseSchema = registry.register(
  "TssUserSignInSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: SignInResponseSchema,
  }),
);

// V2: Response for combined keygen (secp256k1 + ed25519)
export const SignInResponseV2Schema = registry.register(
  "TssUserSignInResponseV2",
  z.object({
    token: z.string().openapi({
      description: "JWT token for authentication",
    }),
    user: z
      .object({
        wallet_id_secp256k1: z.string().openapi({
          description: "Unique secp256k1 wallet identifier",
        }),
        wallet_id_ed25519: z.string().openapi({
          description: "Unique ed25519 wallet identifier",
        }),
        public_key_secp256k1: z.string().openapi({
          description: "secp256k1 public key in hex format",
        }),
        public_key_ed25519: z.string().openapi({
          description: "ed25519 public key in hex format",
        }),
        server_verifying_share_ed25519: z.string().openapi({
          description:
            "Server's ed25519 verifying share (32 bytes hex) - needed for PublicKeyPackage construction",
        }),
        user_identifier: z.string().openapi({
          description: "User identifier",
        }),
        email: z.string().nullable().openapi({
          description: "User email address (nullable)",
        }),
        name: z.string().nullable().openapi({
          description:
            "User name (nullable) Only for OAuth providers that support it",
        }),
      })
      .openapi({
        description: "Authenticated user information with both wallets",
      }),
  }),
);

export const SignInSuccessResponseV2Schema = registry.register(
  "TssUserSignInSuccessResponseV2",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: SignInResponseV2Schema,
  }),
);

const AuthTypeEnum = z.enum(["google", "auth0", "x", "telegram", "discord"]);

export const CheckEmailRequestSchema = registry.register(
  "TssUserCheckEmailRequest",
  z.object({
    email: z.email().openapi({
      description: "User email address to check",
    }),
    auth_type: AuthTypeEnum.optional().default("google").openapi({
      description: "Authentication provider type (defaults to 'google')",
    }),
  }),
);

const KeyshareNodeSchema = registry.register(
  "TssUserKeyshareNodeMeta",
  z.object({
    name: z.string(),
    endpoint: z.string(),
    status: KsNodeStatusEnum,
    wallet_status: WalletStatusEnum,
  }),
);

const CheckEmailDataSchema = registry.register(
  "TssUserCheckEmailData",
  z.object({
    exists: z.boolean().openapi({
      description: "Whether a user with the given email exists",
    }),
    keyshare_node_meta: z
      .object({
        threshold: z.number().int().openapi({
          description: "Keyshare threshold",
        }),
        nodes: z.array(KeyshareNodeSchema).openapi({
          description: "Keyshare nodes metadata",
        }),
      })
      .openapi({ description: "Keyshare node metadata" }),
    needs_reshare: z.boolean().openapi({
      description: "True when wallet has unrecoverable node data loss",
    }),
    reshare_reasons: z
      .array(ReshareReasonEnum)
      .nullable()
      .openapi({ description: "Reasons why reshare is required" }),
    reshare_ready: z.boolean().openapi({
      description: "True when KS nodes are active and reshare is needed",
    }),
    signup_ready: z.boolean().openapi({
      description: "True when all KS nodes are active",
    }),
    active_nodes_below_threshold: z.boolean().openapi({
      description:
        "True when count of active KS nodes is below global SSS threshold",
    }),
  }),
);

// export const CheckEmailSuccessResponseSchema = makeSuccessResponseSchema(
//   CheckEmailDataSchema,
//   "TssUserCheckEmailSuccessResponse",
// );
export const CheckEmailSuccessResponseSchema = registry.register(
  "TssUserCheckEmailSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: CheckEmailDataSchema,
  }),
);

// V2: KeyshareNodeMeta without status field (only wallet_status)
const KeyshareNodeV2Schema = registry.register(
  "TssUserKeyshareNodeMetaV2",
  z.object({
    name: z.string().openapi({ description: "Node name" }),
    endpoint: z.string().openapi({ description: "Node endpoint URL" }),
    wallet_status: WalletStatusEnum.openapi({
      description: "Wallet registration status on this node",
    }),
  }),
);

const KeyshareNodeMetaV2Schema = z
  .object({
    threshold: z.number().int().openapi({
      description: "Keyshare threshold",
    }),
    nodes: z.array(KeyshareNodeV2Schema).openapi({
      description: "Keyshare nodes metadata",
    }),
  })
  .openapi({ description: "Keyshare node metadata" });

// V2: CheckEmailResponseV2 - User does not exist or has no wallets
const CheckEmailDataV2NotExistsSchema = registry.register(
  "TssUserCheckEmailDataV2NotExists",
  z.object({
    exists: z.literal(false).openapi({
      description: "User does not exist",
    }),
    active_nodes_below_threshold: z.boolean().openapi({
      description:
        "True when count of active KS nodes is below global SSS threshold",
    }),
    keyshare_node_meta: KeyshareNodeMetaV2Schema.openapi({
      description: "Global keyshare node metadata for signup flow",
    }),
  }),
);

// V2: CheckEmailResponseV2 - User exists with only secp256k1 wallet (legacy user)
const CheckEmailDataV2NeedsEd25519KeygenSchema = registry.register(
  "TssUserCheckEmailDataV2NeedsEd25519Keygen",
  z.object({
    exists: z.literal(true).openapi({
      description: "User exists",
    }),
    needs_keygen_ed25519: z.literal(true).openapi({
      description: "Indicates ed25519 keygen is required",
    }),
    keyshare_node_meta: KeyshareNodeMetaV2Schema.openapi({
      description: "Keyshare node metadata (secp256k1-based)",
    }),
    needs_reshare: z.boolean().openapi({
      description: "True if secp256k1 wallet needs resharing",
    }),
    reshare_reasons: z
      .array(ReshareReasonEnum)
      .optional()
      .openapi({ description: "Reasons why reshare is required" }),
    active_nodes_below_threshold: z.boolean().openapi({
      description: "True when active nodes count is below threshold",
    }),
  }),
);

// V2: CheckEmailResponseV2 - User exists with both wallets
const CheckEmailDataV2BothWalletsSchema = registry.register(
  "TssUserCheckEmailDataV2BothWallets",
  z.object({
    exists: z.literal(true).openapi({
      description: "User exists",
    }),
    keyshare_node_meta: KeyshareNodeMetaV2Schema.openapi({
      description: "Unified keyshare node metadata",
    }),
    needs_reshare: z.boolean().openapi({
      description: "True if either wallet needs resharing",
    }),
    reshare_reasons: z
      .array(ReshareReasonEnum)
      .optional()
      .openapi({ description: "Reasons why reshare is required" }),
    active_nodes_below_threshold: z.boolean().openapi({
      description: "True when active nodes count is below threshold",
    }),
  }),
);

// V2: CheckEmailResponseV2 union schema
const CheckEmailDataV2Schema = registry.register(
  "TssUserCheckEmailDataV2",
  z.union([
    CheckEmailDataV2NotExistsSchema,
    CheckEmailDataV2NeedsEd25519KeygenSchema,
    CheckEmailDataV2BothWalletsSchema,
  ]),
);

export const CheckEmailSuccessResponseV2Schema = registry.register(
  "TssUserCheckEmailSuccessResponseV2",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: CheckEmailDataV2Schema,
  }),
);

export const ExportSharesRequestSchema = registry.register(
  "TssExportSharesRequest",
  z.object({
    first_login_jwt: z.string().openapi({
      description: "JWT from the first login session",
    }),
    auth_type: AuthTypeEnum.openapi({
      description: "Authentication provider type for re-authentication",
    }),
  }),
);

const ExportSharesDataSchema = registry.register(
  "TssExportSharesData",
  z.object({
    secp256k1_share: z.string().openapi({
      description:
        "Server's secp256k1 TSS share (encrypted private share, raw string)",
    }),
    ed25519_seed_share: z.string().openapi({
      description:
        "Server's ed25519 seed share in hex format (128 chars = 64 bytes, x[32] || y[32])",
    }),
  }),
);

export const ExportSharesSuccessResponseSchema = registry.register(
  "TssExportSharesSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: ExportSharesDataSchema,
  }),
);

const SignInSilentlyDataSchema = registry.register(
  "TssUserSignInSilentlyResponse",
  z.object({
    token: z.string().nullable().openapi({
      description:
        "New JWT token when refreshed or null if existing token is still valid",
    }),
  }),
);

// export const SignInSilentlySuccessResponseSchema = makeSuccessResponseSchema(
//   SignInSilentlyDataSchema,
//   "TssUserSignInSilentlySuccessResponse",
// );
export const SignInSilentlySuccessResponseSchema = registry.register(
  "TssUserSignInSilentlySuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: SignInSilentlyDataSchema,
  }),
);
