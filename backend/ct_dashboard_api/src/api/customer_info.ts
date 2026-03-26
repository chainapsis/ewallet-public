import { randomBytes, randomUUID } from "node:crypto";
import { uploadToS3 } from "@oko-wallet/aws";
import {
  getAPIKeysByCustomerId,
  insertAPIKey,
} from "@oko-wallet/oko-pg-interface/api_keys";
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
import type { Pool } from "pg";
import sharp from "sharp";

interface S3Config {
  s3_region: string;
  s3_access_key_id: string;
  s3_secret_access_key: string;
  s3_bucket: string;
}

export async function getCustomerInfoRequest(
  db: Pool,
  userId: string,
): Promise<OkoApiResponse<Customer>> {
  try {
    const customerRes = await getCustomerByUserId(db, userId);

    if (!customerRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: customerRes.err,
      };
    }

    if (customerRes.data === null) {
      return {
        success: false,
        code: "CUSTOMER_NOT_FOUND",
        msg: "Customer not found",
      };
    }

    return {
      success: true,
      data: customerRes.data,
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `getCustomerInfoRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getCustomerApiKeysRequest(
  db: Pool,
  customerId: string,
): Promise<OkoApiResponse<APIKey[]>> {
  try {
    const apiKeys = await getAPIKeysByCustomerId(db, customerId);

    if (!apiKeys.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: apiKeys.err,
      };
    }

    if (apiKeys.data.length === 0) {
      return {
        success: false,
        code: "API_KEYS_NOT_FOUND",
        msg: "No API keys found",
      };
    }

    return {
      success: true,
      data: apiKeys.data,
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `getCustomerApiKeysRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function updateCustomerInfoRequest(
  db: Pool,
  userId: string,
  body: UpdateCustomerInfoRequest,
  file: Express.Multer.File | undefined,
  s3Config: S3Config,
): Promise<OkoApiResponse<UpdateCustomerInfoResponse>> {
  try {
    const { label, url, delete_logo } = body;
    const shouldDeleteLogo = delete_logo === "true";

    const customerRes = await getCustomerByUserId(db, userId);

    if (!customerRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: customerRes.err,
      };
    }

    if (customerRes.data === null) {
      return {
        success: false,
        code: "CUSTOMER_NOT_FOUND",
        msg: "Customer not found",
      };
    }

    let logo_url: string | null = null;
    let shouldUpdateLogo = false;

    if (shouldDeleteLogo) {
      logo_url = null;
      shouldUpdateLogo = true;
    } else if (file) {
      // Validate, re-encode, and strip metadata with sharp
      let processedBuffer: Buffer;
      try {
        const metadata = await sharp(file.buffer).metadata();

        if (metadata.width !== 128 || metadata.height !== 128) {
          return {
            success: false,
            code: "IMAGE_UPLOAD_FAILED",
            msg: "Image must be exactly 128×128 pixels.",
          };
        }

        // Re-encode to PNG, remove EXIF/metadata, ensure 128x128
        processedBuffer = await sharp(file.buffer)
          .resize(128, 128, { fit: "cover" })
          .png({ quality: 90 })
          .toBuffer();
      } catch (_error) {
        return {
          success: false,
          code: "IMAGE_UPLOAD_FAILED",
          msg: "Invalid image file.",
        };
      }

      // Generate safe S3 key (always PNG now)
      const safeKey = `logos/${customerRes.data.customer_id}-${Date.now()}-${randomUUID()}.png`;

      const uploadRes = await uploadToS3({
        region: s3Config.s3_region,
        accessKeyId: s3Config.s3_access_key_id,
        secretAccessKey: s3Config.s3_secret_access_key,
        bucket: s3Config.s3_bucket,
        key: safeKey,
        body: processedBuffer,
        contentType: "image/png",
      });

      if (!uploadRes.success) {
        return {
          success: false,
          code: "IMAGE_UPLOAD_FAILED",
          msg: `Failed to upload logo: ${uploadRes.err}`,
        };
      }

      logo_url = uploadRes.data;
      shouldUpdateLogo = true;
    }

    if (label !== undefined) {
      const trimmedLabel = label.trim();

      if (trimmedLabel === "") {
        return {
          success: false,
          code: "INVALID_REQUEST",
          msg: "Label cannot be empty or whitespace only.",
        };
      }

      if (trimmedLabel.length < 1 || trimmedLabel.length > 64) {
        return {
          success: false,
          code: "INVALID_REQUEST",
          msg: "Label must be between 1 and 64 characters.",
        };
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
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "No updates provided",
      };
    }

    const updateRes = await updateCustomerInfo(
      db,
      customerRes.data.customer_id,
      updates,
    );

    if (!updateRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: updateRes.err,
      };
    }

    return {
      success: true,
      data: {
        message: "Customer information updated successfully",
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `updateCustomerInfoRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function createApiKeyRequest(
  db: Pool,
  userId: string,
): Promise<OkoApiResponse<APIKey>> {
  try {
    const customerRes = await getCustomerByUserId(db, userId);

    if (!customerRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: customerRes.err,
      };
    }

    if (customerRes.data === null) {
      return {
        success: false,
        code: "CUSTOMER_NOT_FOUND",
        msg: "Customer not found",
      };
    }

    const apiKey = randomBytes(32).toString("hex");
    const insertRes = await insertAPIKey(
      db,
      customerRes.data.customer_id,
      apiKey,
    );

    if (!insertRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: insertRes.err,
      };
    }

    return {
      success: true,
      data: insertRes.data,
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `createApiKeyRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
