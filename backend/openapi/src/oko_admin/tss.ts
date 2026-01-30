import { z } from "zod";

import { registry } from "../registry";

const TssSessionWithCustomerAndUserSchema = registry.register(
  "TssSessionWithCustomerAndUser",
  z.object({
    session_id: z.string().openapi({
      description: "Unique TSS session identifier",
    }),

    customer_id: z.string().openapi({
      description: "Customer identifier",
    }),

    wallet_id: z.string().openapi({
      description: "Wallet identifier",
    }),

    state: z.enum(["IN_PROGRESS", "COMPLETED", "FAILED"]).openapi({
      description: "TSS session state",
    }),

    created_at: z.iso.datetime().openapi({
      description: "Creation timestamp",
    }),

    updated_at: z.iso.datetime().openapi({
      description: "Last update timestamp",
    }),

    customer_label: z.string().openapi({
      description: "Customer label or name",
    }),

    customer_url: z.string().optional().openapi({
      description: "Customer URL (optional)",
    }),

    wallet_public_key: z.string().optional().openapi({
      description: "Wallet public key in hex format (optional)",
    }),

    user_email: z.email().optional().openapi({
      description: "User email address (optional)",
    }),

    curve_type: z.string().optional().openapi({
      description: "Wallet curve type (optional)",
    }),
  }),
);

export const GetTssSessionListRequestSchema = registry.register(
  "GetTssSessionListRequest",
  z.object({
    limit: z.number().int().optional().openapi({
      description: "Number of TSS sessions to return (default: 10)",
      example: 10,
    }),
    offset: z.number().int().optional().openapi({
      description: "Offset for pagination (default: 0)",
      example: 0,
    }),
    node_id: z.string().optional().openapi({
      description: "Keyshare node ID to filter by (optional)",
    }),
    customer_id: z.string().optional().openapi({
      description: "Customer ID to filter by (optional)",
    }),
    curve_type: z.string().optional().openapi({
      description: "Curve type to filter by (optional, e.g. secp256k1 or ed25519)",
    }),
  }),
);

const TssSessionListPaginationSchema = registry.register(
  "TssSessionListPagination",
  z.object({
    has_next: z.boolean().openapi({
      description: "Whether there is a next page",
    }),
    has_prev: z.boolean().openapi({
      description: "Whether there is a previous page",
    }),
  }),
);

const TssSessionListDataSchema = registry.register(
  "TssSessionListData",
  z.object({
    tss_sessions: z
      .array(
        TssSessionWithCustomerAndUserSchema.openapi({
          description: "TSS session info including customer/user context",
        }),
      )
      .openapi({
        description: "List of TSS sessions",
      }),

    pagination: TssSessionListPaginationSchema.openapi({
      description: "Pagination flags for next/prev",
    }),
  }),
);

// export const GetTssSessionListSuccessResponseSchema = makeSuccessResponseSchema(
//   TssSessionListDataSchema,
//   "GetTssSessionListSuccessResponse",
// );
export const GetTssSessionListSuccessResponseSchema = registry.register(
  "GetTssSessionListSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: TssSessionListDataSchema,
  }),
);

const TssActivationSettingSchema = registry.register(
  "TssActivationSetting",
  z.object({
    activation_key: z.string().openapi({
      description: "Global activation key / policy ID",
    }),
    is_enabled: z.boolean().openapi({
      description: "Whether TSS is globally enabled",
    }),
    description: z.string().nullable().optional().openapi({
      description: "Optional description of the activation policy",
    }),
    updated_at: z.iso.datetime().openapi({
      description: "Last update timestamp",
    }),
  }),
);

const TssActivationSettingDataSchema = registry.register(
  "TssActivationSettingData",
  z.object({
    tss_activation_setting: TssActivationSettingSchema.openapi({
      description: "Current global TSS activation setting",
    }),
  }),
);

// export const GetTssAllActivationSettingSuccessResponseSchema =
//   makeSuccessResponseSchema(
//     TssActivationSettingDataSchema,
//     "GetTssAllActivationSettingSuccessResponse",
//   );
export const GetTssAllActivationSettingSuccessResponseSchema =
  registry.register(
    "GetTssAllActivationSettingSuccessResponse",
    z.object({
      success: z.literal(true).openapi({
        description: "Indicates the request succeeded",
      }),
      data: TssActivationSettingDataSchema,
    }),
  );

export const SetTssAllActivationSettingRequestSchema = registry.register(
  "SetTssAllActivationSettingRequest",
  z.object({
    is_enabled: z.boolean().openapi({
      description: "Enable or disable TSS functionality for all users",
    }),
  }),
);

// export const SetTssAllActivationSettingSuccessResponseSchema =
//   makeSuccessResponseSchema(
//     TssActivationSettingDataSchema,
//     "SetTssAllActivationSettingSuccessResponse",
//   );
export const SetTssAllActivationSettingSuccessResponseSchema =
  registry.register(
    "SetTssAllActivationSettingSuccessResponse",
    z.object({
      success: z.literal(true).openapi({
        description: "Indicates the request succeeded",
      }),
      data: TssActivationSettingDataSchema,
    }),
  );
