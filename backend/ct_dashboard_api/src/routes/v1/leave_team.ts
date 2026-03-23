import { randomBytes } from "node:crypto";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  LeaveTeamRequestSchema,
  LeaveTeamSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { updateAPIKeyStatusByCustomerId } from "@oko-wallet/oko-pg-interface/api_keys";
import {
  getPendingAdminTransferByCustomerId,
  insertAdminTransfer,
} from "@oko-wallet/oko-pg-interface/customer_admin_transfers";
import {
  countActiveMembers,
  countAdminsByCustomerId,
  getCTDUserByUserIdAndCustomerId,
  softDeleteCTDUser,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  deleteCustomer,
  getCustomerByUserId,
} from "@oko-wallet/oko-pg-interface/customers";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Response } from "express";

import { sendAdminTransferEmail } from "@oko-wallet-ctd-api/email/admin_transfer";
import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

const TRANSFER_EXPIRY_DAYS = 7;

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/leave",
  tags: ["Customer Dashboard - Team"],
  summary: "Leave team",
  description: "Leave the team. Scenario depends on role and team composition.",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: LeaveTeamRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Left team or transfer requested",
      content: {
        "application/json": {
          schema: LeaveTeamSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Target user required or invalid request",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    404: {
      description: "Target user not found",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

export async function leaveTeam(
  req: CustomerAuthenticatedRequest,
  res: Response<OkoApiResponse<unknown>>,
) {
  try {
    const state = req.app.locals;
    const userId = res.locals.user_id;
    const customerId = res.locals.customer_id;
    const role = res.locals.role;
    const { target_user_id } = req.body;

    // Scenario 1: Member → just leave
    if (role !== "admin") {
      await softDeleteCTDUser(state.db, userId, customerId);
      res.status(200).json({
        success: true,
        data: { action: "left" },
      });
      return;
    }

    // Admin scenarios — check team composition
    const [adminCountRes, memberCountRes] = await Promise.all([
      countAdminsByCustomerId(state.db, customerId),
      countActiveMembers(state.db, customerId),
    ]);

    if (!adminCountRes.success || !memberCountRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to check team composition",
      });
      return;
    }

    const adminCount = adminCountRes.data;
    const totalMembers = memberCountRes.data;

    // Scenario 2: Admin + other admins exist → just leave
    if (adminCount > 1) {
      await softDeleteCTDUser(state.db, userId, customerId);
      res.status(200).json({
        success: true,
        data: { action: "left" },
      });
      return;
    }

    // Scenario 4: Sole user (1 admin, no members) → leave + delete customer
    if (totalMembers === 1) {
      const client = await state.db.connect();
      try {
        await client.query("BEGIN");
        await softDeleteCTDUser(client, userId, customerId);
        await updateAPIKeyStatusByCustomerId(client, customerId, false);
        await deleteCustomer(client, { customer_id: customerId });
        await client.query("COMMIT");
      } catch (_txError) {
        await client.query("ROLLBACK");
        res.status(500).json({
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Failed to leave team",
        });
        return;
      } finally {
        client.release();
      }
      res.status(200).json({
        success: true,
        data: { action: "left" },
      });
      return;
    }

    // Scenario 3: Sole admin with members → must transfer admin role
    if (!target_user_id) {
      res.status(ErrorCodeMap.TARGET_USER_REQUIRED).json({
        success: false,
        code: "TARGET_USER_REQUIRED",
        msg: "Must specify a member to transfer admin role to",
      });
      return;
    }

    if (target_user_id === userId) {
      res.status(ErrorCodeMap.INVALID_REQUEST).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "Cannot transfer admin role to yourself",
      });
      return;
    }

    // Check if there's already a pending transfer
    const pendingTransferRes = await getPendingAdminTransferByCustomerId(
      state.db,
      customerId,
    );
    if (pendingTransferRes.success && pendingTransferRes.data !== null) {
      res.status(ErrorCodeMap.TRANSFER_ALREADY_PENDING).json({
        success: false,
        code: "TRANSFER_ALREADY_PENDING",
        msg: "An admin transfer is already pending",
      });
      return;
    }

    // Verify target user exists and is a member
    const targetRes = await getCTDUserByUserIdAndCustomerId(
      state.db,
      target_user_id,
      customerId,
    );
    if (!targetRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: targetRes.err,
      });
      return;
    }
    if (targetRes.data === null) {
      res.status(ErrorCodeMap.TARGET_USER_NOT_FOUND).json({
        success: false,
        code: "TARGET_USER_NOT_FOUND",
        msg: "Target user not found",
      });
      return;
    }

    // Create admin transfer request
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRANSFER_EXPIRY_DAYS);

    const transferRes = await insertAdminTransfer(state.db, {
      customer_id: customerId,
      from_user_id: userId,
      to_user_id: target_user_id,
      token,
      expires_at: expiresAt,
    });

    if (!transferRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: transferRes.err,
      });
      return;
    }

    // Send admin transfer email
    const customerRes = await getCustomerByUserId(state.db, userId);
    const teamName =
      customerRes.success && customerRes.data ? customerRes.data.label : "Oko";

    const transferUrl = `${state.dapp_dashboard_url}/team/admin-transfer?token=${token}`;

    const emailRes = await sendAdminTransferEmail(
      targetRes.data.email,
      transferUrl,
      teamName,
      state.from_email,
      {
        smtp_host: state.smtp_host,
        smtp_port: state.smtp_port,
        smtp_user: state.smtp_user,
        smtp_pass: state.smtp_pass,
      },
    );

    if (!emailRes.success) {
      res.status(500).json({
        success: false,
        code: "FAILED_TO_SEND_EMAIL",
        msg: "Failed to send admin transfer email",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { action: "transfer_requested" },
    });
    return;
  } catch (_error) {
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
