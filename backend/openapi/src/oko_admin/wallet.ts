import { z } from "zod";

import { registry } from "../registry";
import { PaginationSchema } from "../common/";

const WalletWithEmailAndKSNodesResponseSchema = registry.register(
  "WalletWithEmailAndKSNodesResponse",
  z.object({
    public_key: z.string().openapi({
      description: "Wallet public key in hex format",
    }),

    email: z.email().openapi({
      description: "User email address",
    }),

    auth_type: z.string().openapi({
      description: "User authentication type",
    }),

    wallet_id: z.string().openapi({
      description: "Wallet identifier",
    }),

    wallet_ks_nodes: z
      .array(
        z.string().openapi({
          description: "KS node identifier",
        }),
      )
      .openapi({
        description: "Wallet KS nodes",
      }),
  }),
);

export const GetWalletListRequestSchema = registry.register(
  "GetWalletListRequest",
  z.object({
    limit: z.number().int().optional().openapi({
      description: "Number of wallets to return (default: 10)",
      example: 10,
    }),
    offset: z.number().int().optional().openapi({
      description: "Offset for pagination (default: 0)",
      example: 0,
    }),
  }),
);

const WalletListDataSchema = registry.register(
  "WalletListData",
  z.object({
    wallets: z
      .array(
        WalletWithEmailAndKSNodesResponseSchema.openapi({
          description: "Wallet with user email and KS nodes",
        }),
      )
      .openapi({
        description: "List of wallets",
      }),

    pagination: PaginationSchema.openapi({
      description: "Pagination info",
    }),
  }),
);

// export const GetWalletListSuccessResponseSchema = makeSuccessResponseSchema(
//   WalletListDataSchema,
//   "GetWalletListSuccessResponse",
// );
export const GetWalletListSuccessResponseSchema = registry.register(
  "GetWalletListSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: WalletListDataSchema,
  }),
);

const UserWithWalletsResponseSchema = registry.register(
  "UserWithWalletsResponse",
  z.object({
    user_id: z.string().openapi({
      description: "User identifier",
    }),
    auth_type: z.string().openapi({
      description: "User authentication type",
    }),
    email: z.string().openapi({
      description: "User email address",
    }),
    secp256k1_public_key: z.string().nullable().openapi({
      description: "Secp256k1 wallet public key in hex format",
    }),
    secp256k1_wallet_id: z.string().nullable().openapi({
      description: "Secp256k1 wallet identifier",
    }),
    secp256k1_ks_nodes: z.array(z.string()).openapi({
      description: "Secp256k1 wallet KS nodes",
    }),
    ed25519_public_key: z.string().nullable().openapi({
      description: "Ed25519 wallet public key in hex format",
    }),
    ed25519_wallet_id: z.string().nullable().openapi({
      description: "Ed25519 wallet identifier",
    }),
    ed25519_ks_nodes: z.array(z.string()).openapi({
      description: "Ed25519 wallet KS nodes",
    }),
  }),
);

export const GetUserListRequestSchema = registry.register(
  "GetUserListRequest",
  z.object({
    limit: z.number().int().optional().openapi({
      description: "Number of users to return (default: 10)",
      example: 10,
    }),
    offset: z.number().int().optional().openapi({
      description: "Offset for pagination (default: 0)",
      example: 0,
    }),
  }),
);

const UserListDataSchema = registry.register(
  "UserListData",
  z.object({
    users: z
      .array(
        UserWithWalletsResponseSchema.openapi({
          description: "User with wallets by curve type",
        }),
      )
      .openapi({
        description: "List of users with their wallets",
      }),
    pagination: PaginationSchema.openapi({
      description: "Pagination info",
    }),
  }),
);

export const GetUserListSuccessResponseSchema = registry.register(
  "GetUserListSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: UserListDataSchema,
  }),
);
