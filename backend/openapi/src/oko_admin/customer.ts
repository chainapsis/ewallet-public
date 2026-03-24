import { z } from "zod";

import { registry } from "../registry";

const CustomerSchema = registry.register(
  "Customer",
  z.object({
    customer_id: z.string().openapi({
      description: "Unique customer identifier",
    }),

    label: z.string().openapi({
      description: "Customer label or name",
    }),

    url: z.string().optional().openapi({
      description: "Customer URL",
    }),

    logo_url: z.string().optional().openapi({
      description: "Customer logo URL",
    }),
  }),
);

const CreateCustomerResponseSchema = registry.register(
  "CreateCustomerResponse",
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
      description: "Customer URL (optional)",
    }),

    logo_url: z.string().nullable().optional().openapi({
      description: "Customer logo URL (optional)",
    }),

    email: z.email().openapi({
      description: "Customer email address",
    }),

    message: z.string().openapi({
      description: "Success message",
    }),
  }),
);

const ApiKeySchema = registry.register(
  "ApiKey",
  z.object({
    key_id: z.string().openapi({
      description: "API key identifier",
    }),

    customer_id: z.string().openapi({
      description: "Customer identifier",
    }),

    hashed_key: z.string().openapi({
      description: "Hashed API key",
    }),

    is_active: z.boolean().openapi({
      description: "Whether the API key is active",
    }),

    created_at: z.iso.datetime().openapi({
      description: "Creation timestamp",
    }),

    updated_at: z.iso.datetime().openapi({
      description: "Last update timestamp",
    }),
  }),
);

const CustomerDashboardUserSchema = registry.register(
  "CustomerDashboardUser",
  z.object({
    customer_id: z.string().openapi({
      description: "Customer identifier",
    }),

    user_id: z.string().openapi({
      description: "User identifier",
    }),

    email: z.string().email().openapi({
      description: "User email address",
    }),

    status: z.enum(["ACTIVE", "DELETED"]).openapi({
      description: "User status",
    }),

    is_email_verified: z.boolean().openapi({
      description: "Whether the email is verified",
    }),
  }),
);

const CustomerDashboardUserReminderStatusSchema = registry.register(
  "CustomerDashboardUserReminderStatus",
  z.object({
    has_sent_inactive_reminder: z.boolean().openapi({
      description: "Whether an inactive reminder email has been sent",
    }),

    has_sent_unverified_reminder: z.boolean().openapi({
      description: "Whether an unverified reminder email has been sent",
    }),
  }),
);

const CustomerDashboardUserWithReminderStatusSchema = registry.register(
  "CustomerDashboardUserWithReminderStatus",
  CustomerDashboardUserSchema.merge(CustomerDashboardUserReminderStatusSchema),
);

const CustomerWithAPIKeysSchema = registry.register(
  "CustomerWithAPIKeys",
  z.object({
    customer: CustomerSchema.openapi({
      description: "Customer info",
    }),

    api_keys: z.array(ApiKeySchema).openapi({
      description: "List of API keys for the customer",
    }),

    customer_dashboard_users: z
      .array(CustomerDashboardUserWithReminderStatusSchema)
      .openapi({
        description: "List of customer dashboard users",
      }),

    has_tss_sessions: z.boolean().optional().openapi({
      description:
        "Whether the customer has any TSS sessions (transaction generation)",
    }),
  }),
);

export const CustomerIdParamSchema = z.object({
  customer_id: z.string().openapi({
    description: "ID of the customer",
    param: {
      name: "customer_id",
      in: "path",
      required: true,
    },
  }),
});

export const GetCustomerListQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .optional()
    .openapi({
      description: "Number of customers to return (default: 10)",
      example: 10,
      param: {
        name: "limit",
        in: "query",
        required: false,
      },
    }),
  offset: z.coerce
    .number()
    .int()
    .optional()
    .openapi({
      description: "Offset for pagination (default: 0)",
      example: 0,
      param: {
        name: "offset",
        in: "query",
        required: false,
      },
    }),
});

export const CreateCustomerWithDashboardUserRequestSchema = registry.register(
  "CreateCustomerWithDashboardUserRequest",
  z.object({
    email: z.email().openapi({
      description: "Customer email address",
    }),
    label: z.string().openapi({
      description: "Customer label or name",
    }),
    url: z.string().optional().openapi({
      description: "Customer URL (optional)",
    }),
    logo: z.any().optional().openapi({
      description: "Customer logo file (image)",
      format: "binary",
      type: "string",
    }),
  }),
);

const DeleteCustomerAndCustomerDashboardUsersResponseSchema = registry.register(
  "DeleteCustomerAndCustomerDashboardUsersResponse",
  z.object({
    customer_id: z.string().openapi({
      description: "ID of the deleted customer",
    }),

    customer_dashboard_user_ids: z
      .array(
        z.string().openapi({
          description: "ID of the deleted customer dashboard user",
        }),
      )
      .openapi({
        description: "Deleted dashboard user IDs",
      }),
  }),
);

const CustomerListPaginationSchema = registry.register(
  "CustomerListPagination",
  z.object({
    total: z.number().openapi({
      description: "Total number of customers",
    }),
    current_page: z.number().openapi({
      description: "Current page number",
    }),
    total_pages: z.number().openapi({
      description: "Total number of pages",
    }),
    verified_count: z.number().openapi({
      description: "Total number of verified customers",
    }),
    tx_active_count: z.number().openapi({
      description: "Total number of customers with active transactions",
    }),
  }),
);

const CustomerListDataSchema = registry.register(
  "CustomerListData",
  z.object({
    customerWithAPIKeysList: z
      .array(
        CustomerWithAPIKeysSchema.openapi({
          description: "Customer including API keys",
        }),
      )
      .openapi({
        description: "List of customers with API keys",
      }),
    pagination: CustomerListPaginationSchema,
  }),
);

export const CreateCustomerSuccessResponseSchema = registry.register(
  "CreateCustomerSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: CreateCustomerResponseSchema,
  }),
);

export const GetCustomerListSuccessResponseSchema = registry.register(
  "GetCustomerListSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: CustomerListDataSchema,
  }),
);

export const GetCustomerSuccessResponseSchema = registry.register(
  "CreateCustomerSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: CustomerSchema,
  }),
);

export const DeleteCustomerSuccessResponseSchema = registry.register(
  "DeleteCustomerSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: DeleteCustomerAndCustomerDashboardUsersResponseSchema,
  }),
);

export const ResendCustomerUserPasswordRequestSchema = registry.register(
  "ResendCustomerUserPasswordRequest",
  z.object({
    customer_id: z.string().openapi({
      description: "Customer ID",
    }),
    email: z.string().email().openapi({
      description: "Email address of the customer dashboard user",
    }),
  }),
);

export const ResendCustomerUserPasswordResponseSchema = registry.register(
  "ResendCustomerUserPasswordResponse",
  z.object({
    message: z.string().openapi({
      description: "Success message",
    }),
  }),
);

export const ResendCustomerUserPasswordSuccessResponseSchema =
  registry.register(
    "ResendCustomerUserPasswordSuccessResponse",
    z.object({
      success: z.literal(true).openapi({
        description: "Indicates the request succeeded",
      }),
      data: ResendCustomerUserPasswordResponseSchema,
    }),
  );

export const TypeformSignatureHeaderSchema = z.object({
  "typeform-signature": z.string().openapi({
    description: "Typeform webhook signature",
    example: "sha256=base64-signature",
    param: {
      name: "typeform-signature",
      in: "header",
      required: true,
    },
  }),
});

const TypeformAnswerFieldSchema = registry.register(
  "TypeformAnswerField",
  z.object({
    id: z.string().openapi({
      description: "Field identifier",
    }),
    type: z.string().openapi({
      description: "Field type",
    }),
    ref: z.string().openapi({
      description: "Field reference",
    }),
  }),
);

const TypeformAnswerSchema = registry.register(
  "TypeformAnswer",
  z.object({
    type: z.string().openapi({
      description: "Answer type",
    }),
    email: z.string().optional().openapi({
      description: "Email answer",
    }),
    text: z.string().optional().openapi({
      description: "Text answer",
    }),
    url: z.string().optional().openapi({
      description: "URL answer",
    }),
    field: TypeformAnswerFieldSchema.optional(),
  }),
);

export const TypeformWebhookRequestSchema = registry.register(
  "TypeformWebhookRequest",
  z.object({
    event_id: z.string().optional().openapi({
      description: "Typeform event ID",
    }),
    event_type: z.string().optional().openapi({
      description: "Typeform event type",
    }),
    form_response: z
      .object({
        form_id: z.string().optional().openapi({
          description: "Form identifier",
        }),
        token: z.string().optional().openapi({
          description: "Response token",
        }),
        answers: z.array(TypeformAnswerSchema).optional().openapi({
          description: "Form answers",
        }),
      })
      .optional()
      .openapi({
        description: "Form response payload",
      }),
  }),
);
