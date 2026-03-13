import { registry } from "@oko-wallet/oko-api-openapi";
import { z } from "zod";

export const SuccessResponseSchema = registry.register(
  "SuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: z.looseObject({}).openapi({
      description: "Response data",
    }),
  }),
);

export const ErrorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({
    success: z.literal(false).openapi({
      description: "Indicates the request failed",
    }),
    code: z.string().openapi({
      description: "Error code",
      example: "USER_NOT_FOUND",
    }),
    msg: z.string().openapi({
      description: "Error message",
      example: "User does not exist",
    }),
  }),
);

export const AdminAuthHeaderSchema = z.object({
  Authorization: z
    .string()
    .regex(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/)
    .openapi({
      description: "Bearer token for admin authentication",
      example: "Bearer eyJhbGciOiJIUzI1NiIs...",
      param: {
        name: "Authorization",
        in: "header",
        required: true,
      },
    }),
});

export const UserAuthHeaderSchema = z.object({
  Authorization: z
    .string()
    .regex(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/)
    .openapi({
      description: "Bearer token for end-user authentication",
      example: "Bearer eyJhbGciOiJIUzI1NiIs...",
      param: {
        name: "Authorization",
        in: "header",
        required: true,
      },
    }),
});

export const OAuthHeaderSchema = z.object({
  Authorization: z
    .string()
    .regex(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/)
    .openapi({
      description: "OAuth bearer token (Google or Auth0)",
      example: "Bearer ya29.a0AWY7C...",
      param: {
        name: "Authorization",
        in: "header",
        required: true,
      },
    }),
});

export const ApiKeyHeaderSchema = z.object({
  "x-api-key": z.string().openapi({
    description: "Customer API key",
    example: "test-api-key",
    param: {
      name: "x-api-key",
      in: "header",
      required: true,
    },
  }),
});

export const PaginationSchema = registry.register(
  "Pagination",
  z.object({
    total: z.number().openapi({
      description: "Total number of matching customers",
    }),
    current_page: z.number().openapi({
      description: "Current page index",
    }),
    total_pages: z.number().openapi({
      description: "Total number of pages",
    }),
  }),
);
