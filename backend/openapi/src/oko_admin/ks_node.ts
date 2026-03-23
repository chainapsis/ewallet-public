import { z } from "zod";

import { registry } from "../registry";

export const KSNodeWithHealthCheckSchema = registry.register(
  "KSNodeWithHealthCheck",
  z.object({
    node_id: z.string().openapi({
      description: "Unique node identifier",
    }),

    node_name: z.string().openapi({
      description: "Node name",
    }),

    status: z.enum(["ACTIVE", "INACTIVE"]).openapi({
      description: "Node status",
    }),

    server_url: z.string().openapi({
      description: "Node server URL",
    }),

    created_at: z.iso.datetime().openapi({
      description: "Creation timestamp",
    }),

    updated_at: z.iso.datetime().openapi({
      description: "Last update timestamp",
    }),

    health_check_status: z
      .enum(["HEALTHY", "UNHEALTHY"])
      .nullable()
      .optional()
      .openapi({
        description: "Latest health check status (optional)",
      }),

    health_checked_at: z.iso.datetime().nullable().optional().openapi({
      description: "Latest health check timestamp (optional)",
    }),
  }),
);

const KSNodeStatusSchema = z.enum(["ACTIVE", "INACTIVE"]).openapi({
  description: "Node status",
});

const KSNodeHealthStatusSchema = z.enum(["HEALTHY", "UNHEALTHY"]).openapi({
  description: "Health check status",
});

export const KeyShareNodeSchema = registry.register(
  "KeyShareNode",
  z.object({
    node_id: z.string().openapi({
      description: "Unique node identifier",
    }),
    node_name: z.string().openapi({
      description: "Node name",
    }),
    status: KSNodeStatusSchema,
    server_url: z.string().openapi({
      description: "Node server URL",
    }),
    created_at: z.iso.datetime().openapi({
      description: "Creation timestamp",
    }),
    updated_at: z.iso.datetime().openapi({
      description: "Last update timestamp",
    }),
  }),
);

const KSNodeIdSchema = registry.register(
  "KSNodeId",
  z.object({
    node_id: z.string().openapi({
      description: "Unique node identifier",
    }),
  }),
);

export const GetAllKSNodeSuccessResponseSchema = registry.register(
  "GetAllKSNodeSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: z.object({
      ksNodes: z.array(KSNodeWithHealthCheckSchema).openapi({
        description: "List of key share nodes with health status",
      }),
    }),
  }),
);

export const GetKSNodeByIdRequestSchema = registry.register(
  "GetKSNodeByIdRequest",
  z.object({
    node_id: z.string().openapi({
      description: "Node identifier",
    }),
  }),
);

export const GetKSNodeByIdSuccessResponseSchema = registry.register(
  "GetKSNodeByIdSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: z.object({
      ksNode: KeyShareNodeSchema.openapi({
        description: "Key share node",
      }),
    }),
  }),
);

export const CreateKSNodeRequestSchema = registry.register(
  "CreateKSNodeRequest",
  z.object({
    node_name: z.string().openapi({
      description: "Node name",
    }),
    server_url: z.string().openapi({
      description: "Node server URL",
    }),
  }),
);

export const CreateKSNodeSuccessResponseSchema = registry.register(
  "CreateKSNodeSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: KSNodeIdSchema,
  }),
);

export const UpdateKSNodeRequestSchema = registry.register(
  "UpdateKSNodeRequest",
  z.object({
    node_id: z.string().openapi({
      description: "Node identifier",
    }),
    server_url: z.string().openapi({
      description: "Node server URL",
    }),
  }),
);

export const UpdateKSNodeSuccessResponseSchema = registry.register(
  "UpdateKSNodeSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: KSNodeIdSchema,
  }),
);

export const DeactivateKSNodeRequestSchema = registry.register(
  "DeactivateKSNodeRequest",
  z.object({
    node_id: z.string().openapi({
      description: "Node identifier",
    }),
  }),
);

export const DeactivateKSNodeSuccessResponseSchema = registry.register(
  "DeactivateKSNodeSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: KSNodeIdSchema,
  }),
);

export const ActivateKSNodeRequestSchema = registry.register(
  "ActivateKSNodeRequest",
  z.object({
    node_id: z.string().openapi({
      description: "Node identifier",
    }),
  }),
);

export const ActivateKSNodeSuccessResponseSchema = registry.register(
  "ActivateKSNodeSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: KSNodeIdSchema,
  }),
);

export const DeleteKSNodeRequestSchema = registry.register(
  "DeleteKSNodeRequest",
  z.object({
    node_id: z.string().openapi({
      description: "Node identifier",
    }),
  }),
);

export const DeleteKSNodeSuccessResponseSchema = registry.register(
  "DeleteKSNodeSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: KSNodeIdSchema,
  }),
);

// ── Key Share Node Meta ──────────────────────────────────────────────

export const UpdateKeyShareNodeMetaRequestSchema = registry.register(
  "UpdateKeyShareNodeMetaRequest",
  z.object({
    registration_threshold: z.number().int().nullable().openapi({
      description:
        "Minimum nodes required for registration (null = all-or-nothing). Must be >= sss_threshold.",
    }),
  }),
);

export const UpdateKeyShareNodeMetaSuccessResponseSchema = registry.register(
  "UpdateKeyShareNodeMetaSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: z.object({
      registration_threshold: z.number().int().nullable().openapi({
        description: "Updated registration threshold value",
      }),
    }),
  }),
);

// ── Health Check ─────────────────────────────────────────────────────

const KSNodeHealthCheckSchema = registry.register(
  "KSNodeHealthCheck",
  z.object({
    check_id: z.string().openapi({
      description: "Health check identifier",
    }),
    node_id: z.string().openapi({
      description: "Node identifier",
    }),
    status: KSNodeHealthStatusSchema,
    created_at: z.iso.datetime().openapi({
      description: "Creation timestamp",
    }),
    updated_at: z.iso.datetime().openapi({
      description: "Last update timestamp",
    }),
  }),
);

export const GetKSNHealthChecksRequestSchema = registry.register(
  "GetKSNHealthChecksRequest",
  z.object({
    pageIndex: z.number().int().openapi({
      description: "Page index for pagination",
      example: 0,
    }),
    pageSize: z.number().int().openapi({
      description: "Page size for pagination",
      example: 20,
    }),
  }),
);

export const GetKSNHealthChecksSuccessResponseSchema = registry.register(
  "GetKSNHealthChecksSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: z.object({
      rows: z.array(KSNodeHealthCheckSchema).openapi({
        description: "List of health check rows",
      }),
      has_next: z.boolean().openapi({
        description: "Whether a next page exists",
      }),
    }),
  }),
);
