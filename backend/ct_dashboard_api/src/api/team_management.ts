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
import type { Pool } from "pg";

export async function leaveTeamRequest(
  db: Pool,
  body: LeaveTeamRequest,
  teamContext: { user_id: string; customer_id: string; role: string },
): Promise<OkoApiResponse<{ action: string }>> {
  try {
    const { target_user_id } = body;
    const { user_id: userId, customer_id: customerId, role } = teamContext;

    // Scenario 1: Member → just leave
    if (role !== "admin") {
      const deleteRes = await softDeleteCTDUser(db, userId, customerId);
      if (!deleteRes.success) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Failed to leave team",
        };
      }
      return {
        success: true,
        data: { action: "left" },
      };
    }

    // Admin scenarios — check team composition
    const [adminCountRes, memberCountRes] = await Promise.all([
      countAdminsByCustomerId(db, customerId),
      countActiveMembers(db, customerId),
    ]);

    if (!adminCountRes.success || !memberCountRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to check team composition",
      };
    }

    const adminCount = adminCountRes.data;
    const totalMembers = memberCountRes.data;

    // Scenario 2: Admin + other admins exist → just leave
    if (adminCount > 1) {
      const deleteRes = await softDeleteCTDUser(db, userId, customerId);
      if (!deleteRes.success) {
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Failed to leave team",
        };
      }
      return {
        success: true,
        data: { action: "left" },
      };
    }

    // Scenario 4: Sole user (1 admin, no members) → leave + delete customer
    if (totalMembers === 1) {
      const client = await db.connect();
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
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Failed to leave team",
        };
      } finally {
        client.release();
      }
      return {
        success: true,
        data: { action: "left" },
      };
    }

    // Scenario 3: Sole admin with members → instant transfer + leave
    if (!target_user_id) {
      return {
        success: false,
        code: "TARGET_USER_REQUIRED",
        msg: "Must specify a member to transfer admin role to",
      };
    }

    if (target_user_id === userId) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "Cannot transfer admin role to yourself",
      };
    }

    // Verify target user exists and is a member
    const targetRes = await getCTDUserByUserIdAndCustomerId(
      db,
      target_user_id,
      customerId,
    );
    if (!targetRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: targetRes.err,
      };
    }
    if (targetRes.data === null) {
      return {
        success: false,
        code: "TARGET_USER_NOT_FOUND",
        msg: "Target user not found",
      };
    }

    // Promote target + remove self in transaction
    const client = await db.connect();
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
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to transfer admin role",
      };
    } finally {
      client.release();
    }

    return {
      success: true,
      data: { action: "left" },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `leaveTeamRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
