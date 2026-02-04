import { uploadToS3 } from "@oko-wallet/aws";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  GetCustomerApiKeysRequestSchema,
  GetCustomerApiKeysSuccessResponseSchema,
  GetCustomerInfoSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { getAPIKeysByCustomerId } from "@oko-wallet/oko-pg-interface/api_keys";
import {
  getCustomerByUserId,
  updateCustomerInfo,
} from "@oko-wallet/oko-pg-interface/customers";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { APIKey } from "@oko-wallet/oko-types/ct_dashboard";
import type {
  Customer,
  UpdateCustomerInfoRequest,
  UpdateCustomerInfoResponse,
} from "@oko-wallet/oko-types/customers";
import { randomUUID } from "crypto";
import type { Response, Router } from "express";
import sharp from "sharp";

import {
  type CustomerAuthenticatedRequest,
  customerJwtMiddleware,
} from "@oko-wallet-usrd-api/middleware/auth";
import { multerMiddleware } from "@oko-wallet-usrd-api/middleware/multer";
import { rateLimitMiddleware } from "@oko-wallet-usrd-api/middleware/rate_limit";

export function setUserRoutes(router: Router) {
  registry.registerPath({
    method: "post",
    path: "/customer_dashboard/v1/customer/info",
    tags: ["Customer Dashboard"],
    summary: "Get customer information",
    description: "Retrieves customer information for the authenticated user",
    security: [{ customerAuth: [] }],
    request: {
      headers: CustomerAuthHeaderSchema,
    },
    responses: {
      200: {
        description: "Customer information retrieved successfully",
        content: {
          "application/json": {
            schema: GetCustomerInfoSuccessResponseSchema,
          },
        },
      },
      401: {
        description: "User not authenticated",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Customer not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });
  router.post(
    "/customer/info",
    customerJwtMiddleware,
    async (
      req: CustomerAuthenticatedRequest,
      res: Response<OkoApiResponse<Customer>>,
    ) => {
      try {
        const state = req.app.locals as any;

        const customerRes = await getCustomerByUserId(
          state.db,
          res.locals.user_id,
        );

        if (!customerRes.success) {
          res.status(500).json({
            success: false,
            code: "UNKNOWN_ERROR",
            msg: customerRes.err,
          });
          return;
        }

        if (customerRes.data === null) {
          res.status(404).json({
            success: false,
            code: "CUSTOMER_NOT_FOUND",
            msg: "Customer not found",
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: customerRes.data,
        });
        return;
      } catch (error) {
        console.error("Get customer info error:", error);
        res.status(500).json({
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Internal server error",
        });
        return;
      }
    },
  );

  registry.registerPath({
    method: "post",
    path: "/customer_dashboard/v1/customer/api_keys",
    tags: ["Customer Dashboard"],
    summary: "Get customer API keys",
    description: "Retrieves API keys for the specified customer",
    security: [{ customerAuth: [] }],
    request: {
      headers: CustomerAuthHeaderSchema,
      body: {
        required: true,
        content: {
          "application/json": {
            schema: GetCustomerApiKeysRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "API keys retrieved successfully",
        content: {
          "application/json": {
            schema: GetCustomerApiKeysSuccessResponseSchema,
          },
        },
      },
      401: {
        description: "User not authenticated",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "API keys not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });
  router.post(
    "/customer/api_keys",
    customerJwtMiddleware,
    async (
      req: CustomerAuthenticatedRequest<{ customer_id: string }>,
      res: Response<OkoApiResponse<APIKey[]>>,
    ) => {
      try {
        const state = req.app.locals as any;

        const apiKeys = await getAPIKeysByCustomerId(
          state.db,
          req.body.customer_id,
        );

        if (!apiKeys.success) {
          res.status(500).json({
            success: false,
            code: "UNKNOWN_ERROR",
            msg: apiKeys.err,
          });
          return;
        }

        if (apiKeys.data.length === 0) {
          res.status(404).json({
            success: false,
            code: "API_KEYS_NOT_FOUND",
            msg: "No API keys found",
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: apiKeys.data,
        });
      } catch (error) {
        console.error("Get API keys error:", error);
        res.status(500).json({
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Internal server error",
        });
      }
    },
  );

  // OpenAPI registration for update_info endpoint
  registry.registerPath({
    method: "post",
    path: "/customer_dashboard/v1/customer/update_info",
    tags: ["Customer Dashboard"],
    summary: "Update customer information",
    description: "Updates customer label and/or logo. Logo is uploaded to S3.",
    security: [{ customerAuth: [] }],
    request: {
      headers: CustomerAuthHeaderSchema,
      body: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                  description: "Customer/Team name",
                },
                url: {
                  type: "string",
                  description: "App URL",
                },
                logo: {
                  type: "string",
                  format: "binary",
                  description:
                    "Logo image file (128×128 px, under 1 MB, no SVG)",
                },
                delete_logo: {
                  type: "string",
                  enum: ["true"],
                  description: "Set to 'true' to delete existing logo",
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Customer information updated successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                data: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid input",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "User not authenticated",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Customer not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });

  router.post(
    "/customer/update_info",
    rateLimitMiddleware({ windowSeconds: 10 * 60, maxRequests: 20 }),
    customerJwtMiddleware,
    multerMiddleware,
    async (
      req: CustomerAuthenticatedRequest<UpdateCustomerInfoRequest> & {
        file?: Express.Multer.File;
      },
      res: Response<OkoApiResponse<UpdateCustomerInfoResponse>>,
    ) => {
      try {
        const state = req.app.locals as any;
        const userId = res.locals.user_id;
        const { label, url, delete_logo } = req.body;

        const shouldDeleteLogo = delete_logo === "true";

        const customerRes = await getCustomerByUserId(state.db, userId);

        if (!customerRes.success) {
          res.status(500).json({
            success: false,
            code: "UNKNOWN_ERROR",
            msg: customerRes.err,
          });
          return;
        }

        if (customerRes.data === null) {
          res.status(404).json({
            success: false,
            code: "CUSTOMER_NOT_FOUND",
            msg: "Customer not found",
          });
          return;
        }

        let logo_url: string | null = null;
        let shouldUpdateLogo = false;

        if (shouldDeleteLogo) {
          logo_url = null;
          shouldUpdateLogo = true;
        } else if (req.file) {
          // Validate, re-encode, and strip metadata with sharp
          let processedBuffer: Buffer;
          try {
            const metadata = await sharp(req.file.buffer).metadata();

            if (metadata.width !== 128 || metadata.height !== 128) {
              res.status(400).json({
                success: false,
                code: "IMAGE_UPLOAD_FAILED",
                msg: "Image must be exactly 128×128 pixels.",
              });
              return;
            }

            // Re-encode to PNG, remove EXIF/metadata, ensure 128x128
            processedBuffer = await sharp(req.file.buffer)
              .resize(128, 128, { fit: "cover" })
              .png({ quality: 90 })
              .toBuffer();
          } catch (error) {
            res.status(400).json({
              success: false,
              code: "IMAGE_UPLOAD_FAILED",
              msg: "Invalid image file.",
            });
            return;
          }

          // Generate safe S3 key (always PNG now)
          const safeKey = `logos/${customerRes.data.customer_id}-${Date.now()}-${randomUUID()}.png`;

          const uploadRes = await uploadToS3({
            region: state.s3_region,
            accessKeyId: state.s3_access_key_id,
            secretAccessKey: state.s3_secret_access_key,
            bucket: state.s3_bucket,
            key: safeKey,
            body: processedBuffer,
            contentType: "image/png", // Always PNG
          });

          if (!uploadRes.success) {
            res.status(500).json({
              success: false,
              code: "IMAGE_UPLOAD_FAILED",
              msg: `Failed to upload logo: ${uploadRes.err}`,
            });
            return;
          }

          // Don't decode - use URL as-is from S3
          logo_url = uploadRes.data;
          shouldUpdateLogo = true;
        }

        if (label !== undefined) {
          const trimmedLabel = label.trim();

          if (trimmedLabel === "") {
            res.status(400).json({
              success: false,
              code: "INVALID_REQUEST",
              msg: "Label cannot be empty or whitespace only.",
            });
            return;
          }

          if (trimmedLabel.length < 1 || trimmedLabel.length > 64) {
            res.status(400).json({
              success: false,
              code: "INVALID_REQUEST",
              msg: "Label must be between 1 and 64 characters.",
            });
            return;
          }
        }

        const updates: {
          label?: string;
          url?: string | null;
          logo_url?: string | null;
        } = {};
        if (label !== undefined && label.trim() !== "") {
          updates.label = label.trim();
        }
        if (url !== undefined) {
          updates.url = url.trim() === "" ? null : url.trim();
        }
        if (shouldUpdateLogo) {
          updates.logo_url = logo_url;
        }

        if (Object.keys(updates).length === 0) {
          res.status(400).json({
            success: false,
            code: "INVALID_REQUEST",
            msg: "No updates provided",
          });
          return;
        }

        const updateRes = await updateCustomerInfo(
          state.db,
          customerRes.data.customer_id,
          updates,
        );

        if (!updateRes.success) {
          res.status(500).json({
            success: false,
            code: "UNKNOWN_ERROR",
            msg: updateRes.err,
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            message: "Customer information updated successfully",
          },
        });
        return;
      } catch (error) {
        console.error("Update customer info error:", error);
        res.status(500).json({
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Internal server error",
        });
        return;
      }
    },
  );
}
