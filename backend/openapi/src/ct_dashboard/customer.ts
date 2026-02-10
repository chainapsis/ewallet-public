import { z } from "zod";

import { registry } from "../registry";

export const CustomerSchema = registry.register(
  "CustomerDashboardCustomer",
  z.object({
    customer_id: z.string().openapi({
      description: "Unique customer identifier",
    }),
    label: z.string().openapi({
      description: "Customer label or name",
    }),
    status: z.enum(["ACTIVE", "DELETED"]).openapi({
      description: "Customer status",
    }),
    url: z.string().nullable().optional().openapi({
      description: "Customer URL",
    }),
    logo_url: z.string().nullable().optional().openapi({
      description: "Customer logo URL",
    }),
    theme: z.string().openapi({
      description: "Customer theme it returns 'light', 'dark' or 'system'",
    }),
  }),
);

export const ApiKeySchema = registry.register(
  "CustomerDashboardApiKey",
  z.object({
    customer_id: z.string().openapi({
      description: "Customer identifier",
    }),
    hashed_key: z.string().openapi({
      description: "Hashed API key",
    }),
    is_active: z.boolean().openapi({
      description: "Whether the API key is active",
    }),
  }),
);

// export const GetCustomerInfoSuccessResponseSchema = makeSuccessResponseSchema(
//   CustomerSchema,
//   "CustomerDashboardGetCustomerInfoSuccessResponse",
// );

export const GetCustomerInfoSuccessResponseSchema = registry.register(
  "CustomerDashboardGetCustomerInfoSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: CustomerSchema,
  }),
);

export const GetCustomerApiKeysRequestSchema = registry.register(
  "CustomerDashboardGetCustomerApiKeysRequest",
  z.object({
    customer_id: z.string().openapi({
      description: "Customer identifier",
    }),
  }),
);

const CustomerApiKeysDataSchema = registry.register(
  "CustomerDashboardApiKeysData",
  z
    .array(
      ApiKeySchema.openapi({
        description: "Customer API key",
      }),
    )
    .openapi({
      description: "List of customer API keys",
    }),
);

// export const GetCustomerApiKeysSuccessResponseSchema =
//   makeSuccessResponseSchema(
//     CustomerApiKeysDataSchema,
//     "CustomerDashboardGetCustomerApiKeysSuccessResponse",
//   );

export const GetCustomerApiKeysSuccessResponseSchema = registry.register(
  "CustomerDashboardGetCustomerApiKeysSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: CustomerApiKeysDataSchema,
  }),
);

export const CreateApiKeySuccessResponseSchema = registry.register(
  "CustomerDashboardCreateApiKeySuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: ApiKeySchema,
  }),
);

export const DeleteApiKeyRequestSchema = registry.register(
  "CustomerDashboardDeleteApiKeyRequest",
  z.object({
    key_id: z.string().openapi({
      description: "API key ID to delete",
    }),
  }),
);

export const DeleteApiKeySuccessResponseSchema = registry.register(
  "CustomerDashboardDeleteApiKeySuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: z.object({
      key_id: z.string().openapi({
        description: "Deleted API key ID",
      }),
    }),
  }),
);
