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
  countActiveMembers,
  countAdminsByCustomerId,
  getCTDUserByUserIdAndCustomerId,
  softDeleteCTDUser,
  updateCTDUserRole,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { deleteCustomer } from "@oko-wallet/oko-pg-interface/customers";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { LeaveTeamRequest } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

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
      description: "Left team",
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
  req: CustomerAuthenticatedRequest<LeaveTeamRequest>,
  res: Response<OkoApiResponse<unknown>>,
) {
  try {
    const state = req.app.locals;
    const userId = res.locals.user_id;
    const { customer_id: customerId, role } = res.locals.team;
    const { target_user_id } = req.body;

    // Scenario 1: Member → just leave
    if (role !== "admin") {
      const deleteRes = await softDeleteCTDUser(state.db, userId, customerId);
      if (!deleteRes.success) {
        res.status(500).json({
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Failed to leave team",
        });
        return;
      }
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
      const deleteRes = await softDeleteCTDUser(state.db, userId, customerId);
      if (!deleteRes.success) {
        res.status(500).json({
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Failed to leave team",
        });
        return;
      }
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

        const delUserRes = await softDeleteCTDUser(client, userId, customerId);
        if (!delUserRes.success) {
          throw new Error(delUserRes.err);
        }

        const delKeysRes = await updateAPIKeyStatusByCustomerId(
          client,
          customerId,
          false,
        );
        if (!delKeysRes.success) {
          throw new Error(delKeysRes.err);
        }

        const delCustRes = await deleteCustomer(client, {
          customer_id: customerId,
        });
        if (!delCustRes.success) {
          throw new Error(delCustRes.err);
        }

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

    // Scenario 3: Sole admin with members → instant transfer + leave
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

    // Promote target + remove self in transaction
    const client = await state.db.connect();
    try {
      await client.query("BEGIN");

      const promoteRes = await updateCTDUserRole(
        client,
        target_user_id,
        customerId,
        "admin",
      );
      if (!promoteRes.success) {
        throw new Error(promoteRes.err);
      }

      const deleteRes = await softDeleteCTDUser(client, userId, customerId);
      if (!deleteRes.success) {
        throw new Error(deleteRes.err);
      }

      await client.query("COMMIT");
    } catch (_txError) {
      await client.query("ROLLBACK");
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to transfer admin role",
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
  } catch (_error) {
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
