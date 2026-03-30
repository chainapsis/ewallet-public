import { uploadToS3 } from "@oko-wallet/aws";
import { hashPassword } from "@oko-wallet/crypto-js";
import {
  getAPIKeysByCustomerIdsMap,
  insertAPIKey,
  updateAPIKeyStatusByCustomerId,
} from "@oko-wallet/oko-pg-interface/api_keys";
import {
  deleteCustomerDashboardUserByCustomerId,
  getCTDUsersByCustomerIdsMap,
  getCTDUserWithCustomerByEmail,
  insertCustomerDashboardUser,
  updateCustomerDashboardUserPassword,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  deleteCustomer,
  getCustomer,
  getCustomers,
  getCustomersCount,
  getTxActiveCustomersCount,
  getVerifiedCustomersCount,
  insertCustomer,
} from "@oko-wallet/oko-pg-interface/customers";
import { getEmailSentLogsByUserIdsMap } from "@oko-wallet/oko-pg-interface/email_sent_logs";
import { getTssSessionsExistenceByCustomerIds } from "@oko-wallet/oko-pg-interface/tss";
import type {
  CreateCustomerResponse,
  CreateCustomerWithDashboardUserRequest,
  ResendCustomerUserPasswordRequest,
  ResendCustomerUserPasswordResponse,
  SMTPConfig,
} from "@oko-wallet/oko-types/admin";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  APIKey,
  InsertCustomerDashboardUserRequest,
} from "@oko-wallet/oko-types/ct_dashboard";
import type {
  Customer,
  CustomerWithAPIKeys,
} from "@oko-wallet/oko-types/customers";
import { randomBytes, randomUUID } from "crypto";
import type { Pool } from "pg";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import type { ExtractedTypeformData } from "./typeform";
import { sendCustomerUserPasswordEmail } from "@oko-wallet-admin-api/email";
import { generatePassword } from "@oko-wallet-admin-api/utils/password";

export async function createCustomer(
  db: Pool,
  body: CreateCustomerWithDashboardUserRequest,
  opts: {
    s3: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
    };
    email: {
      fromEmail: string;
      smtpConfig: SMTPConfig;
    };
    logo?: { buffer: Buffer; originalname: string } | null;
  },
): Promise<OkoApiResponse<CreateCustomerResponse>> {
  try {
    if (!body.label || body.label.trim().length === 0) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "Label is required",
      };
    }

    if (body.label.length > 64) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "Label must be 64 characters or less",
      };
    }

    const labelRegex = /^[a-zA-Z0-9\s\-_.]+$/;
    if (!labelRegex.test(body.label)) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "Label contains invalid characters",
      };
    }

    // Check if email is already associated with a team
    const existingUserRes = await getCTDUserWithCustomerByEmail(db, body.email);
    if (!existingUserRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to check existing user: ${existingUserRes.err}`,
      };
    }
    if (existingUserRes.data !== null) {
      return {
        success: false,
        code: "DUPLICATE_TEAM_MEMBER",
        msg: "This email is already associated with a team",
      };
    }

    const customer_id = uuidv4();

    let logo_url: string | null = null;
    if (opts.logo) {
      let metadata: sharp.Metadata;
      try {
        metadata = await sharp(opts.logo.buffer).metadata();
      } catch (_err) {
        return {
          success: false,
          code: "INVALID_IMAGE",
          msg: "Invalid image file",
        };
      }

      if (!metadata.width || !metadata.height) {
        return {
          success: false,
          code: "INVALID_IMAGE",
          msg: "Could not determine image dimensions",
        };
      }

      if (metadata.width !== 128 || metadata.height !== 128) {
        return {
          success: false,
          code: "INVALID_IMAGE",
          msg: "Image must be exactly 128x128 pixels",
        };
      }

      let processedBuffer: Buffer;
      try {
        processedBuffer = await sharp(opts.logo.buffer)
          .resize(128, 128, { fit: "cover" })
          .png({ quality: 90 })
          .toBuffer();
      } catch (_err) {
        return {
          success: false,
          code: "INVALID_IMAGE",
          msg: "Failed to process image",
        };
      }

      const safeKey = `logos/${customer_id}-${Date.now()}-${randomUUID()}.png`;

      const uploadRes = await uploadToS3({
        region: opts.s3.region,
        accessKeyId: opts.s3.accessKeyId,
        secretAccessKey: opts.s3.secretAccessKey,
        bucket: opts.s3.bucket,
        key: safeKey,
        body: processedBuffer,
        contentType: "image/png",
      });

      if (!uploadRes.success) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: `Failed to upload logo to S3: ${uploadRes.err}`,
        };
      }

      logo_url = uploadRes.data;
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const api_key = randomBytes(32).toString("hex");
      const password = generatePassword();
      const user_id = uuidv4();

      const insertAPIKeyRes = await insertAPIKey(client, customer_id, api_key);
      if (insertAPIKeyRes.success === false) {
        throw new Error(`Failed to insert API key: ${insertAPIKeyRes.err}`);
      }

      const password_hash = await hashPassword(password);
      const customerDashboardUser: InsertCustomerDashboardUserRequest = {
        user_id,
        customer_id,
        email: body.email,
        role: "admin",
        status: "ACTIVE",
        is_email_verified: false,
        password_hash,
      };
      const insertCustomerDashboardUserRes = await insertCustomerDashboardUser(
        client,
        customerDashboardUser,
      );
      if (insertCustomerDashboardUserRes.success === false) {
        throw new Error(
          `Failed to create customer dashboard user: ${insertCustomerDashboardUserRes.err}`,
        );
      }

      const customer: Customer = {
        customer_id,
        label: body.label,
        url: body.url || null,
        logo_url,
        status: "ACTIVE",
      };
      const insertCustomerRes = await insertCustomer(client, customer);
      if (insertCustomerRes.success === false) {
        throw new Error(`Failed to create customer: ${insertCustomerRes.err}`);
      }

      const sendCustomerUserPasswordEmailRes =
        await sendCustomerUserPasswordEmail(
          body.email,
          password,
          opts.email.fromEmail,
          opts.email.smtpConfig,
        );
      if (sendCustomerUserPasswordEmailRes.success === false) {
        throw new Error(
          `Failed to send customer password email: ${sendCustomerUserPasswordEmailRes.error}`,
        );
      }

      await client.query("COMMIT");

      const result = {
        success: true as const,
        data: {
          customer_id,
          label: insertCustomerRes.data.label,
          status: insertCustomerRes.data.status,
          url: insertCustomerRes.data.url,
          logo_url: insertCustomerRes.data.logo_url,
          email: insertCustomerDashboardUserRes.data.email,
          message: "Customer created successfully",
        },
      };

      return result;
    } catch (error) {
      await client.query("ROLLBACK");

      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to create customer: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to create customer: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function getCustomerList(
  db: Pool,
  limit: number,
  offset: number,
): Promise<
  OkoApiResponse<{
    customerWithAPIKeysList: CustomerWithAPIKeys[];
    pagination: {
      total: number;
      current_page: number;
      total_pages: number;
      verified_count: number;
      tx_active_count: number;
    };
  }>
> {
  try {
    const customersResult = await getCustomers(db, limit, offset);
    if (customersResult.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get customers: ${customersResult.err}`,
      };
    }

    const customerIds = customersResult.data.map((c) => c.customer_id);

    const apiKeysByCustomerIdsMapRes = await getAPIKeysByCustomerIdsMap(
      db,
      customerIds,
    );
    if (apiKeysByCustomerIdsMapRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get api keys by customer ids: ${apiKeysByCustomerIdsMapRes.err}`,
      };
    }

    const ctdUsersByCustomerIdsMapRes = await getCTDUsersByCustomerIdsMap(
      db,
      customerIds,
    );
    if (ctdUsersByCustomerIdsMapRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get customer dashboard users by customer ids: ${ctdUsersByCustomerIdsMapRes.err}`,
      };
    }

    const allUserIds: string[] = [];
    ctdUsersByCustomerIdsMapRes.data.forEach((users) => {
      users.forEach((u) => {
        allUserIds.push(u.user_id);
      });
    });

    const emailSentLogsMapRes = await getEmailSentLogsByUserIdsMap(
      db,
      allUserIds,
    );
    if (emailSentLogsMapRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get email sent logs: ${emailSentLogsMapRes.err}`,
      };
    }

    const tssSessionsExistenceMapRes =
      await getTssSessionsExistenceByCustomerIds(db, customerIds);
    if (tssSessionsExistenceMapRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get TSS sessions existence by customer ids: ${tssSessionsExistenceMapRes.err}`,
      };
    }

    const customersCountResult = await getCustomersCount(db);
    if (customersCountResult.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get customers count: ${customersCountResult.err}`,
      };
    }

    const verifiedCountResult = await getVerifiedCustomersCount(db);
    if (verifiedCountResult.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get verified customers count: ${verifiedCountResult.err}`,
      };
    }

    const txActiveCountResult = await getTxActiveCustomersCount(db);
    if (txActiveCountResult.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get tx active customers count: ${txActiveCountResult.err}`,
      };
    }

    const total = customersCountResult.data;
    const totalPages = Math.ceil(total / limit);
    const currentPage = total ? Math.floor(offset / limit) + 1 : 0;

    return {
      success: true,
      data: {
        customerWithAPIKeysList: customersResult.data.map((customer) => {
          return {
            customer: {
              ...customer,
            },
            api_keys:
              apiKeysByCustomerIdsMapRes.data.get(customer.customer_id) ||
              ([] as APIKey[]),
            customer_dashboard_users: (
              ctdUsersByCustomerIdsMapRes.data.get(customer.customer_id) || []
            ).map((user) => {
              const logs = emailSentLogsMapRes.data.get(user.user_id) || [];
              return {
                ...user,
                has_sent_inactive_reminder: logs.some(
                  (l) => l.type === "INACTIVE_CUSTOMER_USER",
                ),
                has_sent_unverified_reminder: logs.some(
                  (l) => l.type === "UNVERIFIED_CUSTOMER_USER",
                ),
              };
            }),
            has_tss_sessions:
              tssSessionsExistenceMapRes.data.get(customer.customer_id) ||
              false,
          };
        }),
        pagination: {
          total,
          current_page: currentPage,
          total_pages: totalPages,
          verified_count: verifiedCountResult.data,
          tx_active_count: txActiveCountResult.data,
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to get customer list: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function getCustomerById(
  db: Pool,
  customer_id: string,
): Promise<OkoApiResponse<Customer>> {
  try {
    const customerRes = await getCustomer(db, customer_id);
    if (customerRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get customer by id: ${customerRes.err}`,
      };
    }

    if (customerRes.data === null) {
      return {
        success: false,
        code: "CUSTOMER_NOT_FOUND",
        msg: "Customer not found",
      };
    }

    return { success: true, data: customerRes.data };
  } catch (err) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to get customer by id: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function deleteCustomerAndUsers(
  db: Pool,
  customer_id: string,
): Promise<
  OkoApiResponse<{
    customer_id: string;
    customer_dashboard_user_ids: string[];
  }>
> {
  try {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const deleteCustomerRes = await deleteCustomer(client, { customer_id });
      if (deleteCustomerRes.success === false) {
        throw new Error(`Failed to delete customer: ${deleteCustomerRes.err}`);
      }

      const deleteCustomerDashboardUserRes =
        await deleteCustomerDashboardUserByCustomerId(client, { customer_id });
      if (deleteCustomerDashboardUserRes.success === false) {
        throw new Error(
          `Failed to delete customer dashboard user: ${deleteCustomerDashboardUserRes.err}`,
        );
      }

      const updateAPIKeyStatusRes = await updateAPIKeyStatusByCustomerId(
        client,
        customer_id,
        false,
      );
      if (updateAPIKeyStatusRes.success === false) {
        throw new Error(
          `Failed to update api key status: ${updateAPIKeyStatusRes.err}`,
        );
      }

      await client.query("COMMIT");

      const result = {
        success: true as const,
        data: {
          customer_id: deleteCustomerRes.data.customer_id,
          customer_dashboard_user_ids:
            deleteCustomerDashboardUserRes.data.customer_dashboard_user_ids,
        },
      };

      return result;
    } catch (error) {
      await client.query("ROLLBACK");

      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to delete customer and users: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to delete customer and users: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function resendCustomerUserPassword(
  db: Pool,
  body: ResendCustomerUserPasswordRequest,
  opts: {
    email: {
      fromEmail: string;
      smtpConfig: SMTPConfig;
    };
  },
): Promise<OkoApiResponse<ResendCustomerUserPasswordResponse>> {
  try {
    const userResult = await getCTDUserWithCustomerByEmail(db, body.email);
    if (userResult.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get customer dashboard user: ${userResult.err}`,
      };
    }

    if (userResult.data === null) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: "Customer dashboard user not found",
      };
    }

    if (userResult.data.customer_id !== body.customer_id) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: "Customer dashboard user not found for the given customer_id",
      };
    }

    const user = userResult.data;
    if (user.user.is_email_verified !== false) {
      return {
        success: false,
        code: "EMAIL_ALREADY_VERIFIED",
        msg: "Email is already verified. Password resend is only available for unverified accounts.",
      };
    }

    const password = generatePassword();

    const sendEmailRes = await sendCustomerUserPasswordEmail(
      body.email,
      password,
      opts.email.fromEmail,
      opts.email.smtpConfig,
    );
    if (sendEmailRes.success === false) {
      return {
        success: false,
        code: "FAILED_TO_SEND_EMAIL",
        msg: `Failed to send password email: ${sendEmailRes.error}`,
      };
    }

    const password_hash = await hashPassword(password);
    const updatePasswordRes = await updateCustomerDashboardUserPassword(db, {
      user_id: user.user.user_id,
      password_hash,
    });
    if (updatePasswordRes.success === false) {
      console.error(
        `Failed to update password after email sent for customer ${body.customer_id}, user ${user.user.user_id}: ${updatePasswordRes.err}`,
      );
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to update password: ${updatePasswordRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        message: "Password has been reset and sent to email",
      },
    };
  } catch (err) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to resend customer user password: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function createCustomerByTypeform(
  db: Pool,
  typeformData: ExtractedTypeformData,
  opts: {
    s3: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
    };
    email: {
      fromEmail: string;
      smtpConfig: SMTPConfig;
    };
  },
): Promise<OkoApiResponse<CreateCustomerResponse>> {
  if (!typeformData.email) {
    return {
      success: false,
      code: "INVALID_REQUEST",
      msg: "Email is required",
    };
  }

  if (!typeformData.appName) {
    return {
      success: false,
      code: "INVALID_REQUEST",
      msg: "App name is required",
    };
  }

  const body: CreateCustomerWithDashboardUserRequest = {
    email: typeformData.email,
    label: typeformData.appName,
    url: typeformData.appUrl || undefined,
  };

  return createCustomer(db, body, {
    s3: opts.s3,
    email: opts.email,
    logo: null,
  });
}
