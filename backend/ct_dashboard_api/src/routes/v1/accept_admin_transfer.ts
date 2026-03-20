import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  AcceptAdminTransferRequestSchema,
  AcceptAdminTransferSuccessResponseSchema,
  CustomerAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getAdminTransferByToken,
  updateAdminTransferStatus,
} from "@oko-wallet/oko-pg-interface/customer_admin_transfers";
import {
  softDeleteCTDUser,
  updateCTDUserRole,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Response } from "express";

import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/accept_admin_transfer",
  tags: ["Customer Dashboard - Team"],
  summary: "Accept admin transfer",
  description:
    "Accepts an admin role transfer. The accepting user becomes admin, the requesting user is removed.",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: AcceptAdminTransferRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Admin transfer accepted",
      content: {
        "application/json": {
          schema: AcceptAdminTransferSuccessResponseSchema,
        },
      },
    },
    404: {
      description: "Transfer not found",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    410: {
      description: "Transfer expired",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

export async function acceptAdminTransfer(
  req: CustomerAuthenticatedRequest,
  res: Response<OkoApiResponse<unknown>>,
) {
  try {
    const state = req.app.locals;
    const userId = res.locals.user_id;
    const { token } = req.body;

    const transferRes = await getAdminTransferByToken(state.db, token);

    if (!transferRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: transferRes.err,
      });
      return;
    }

    if (transferRes.data === null) {
      res.status(ErrorCodeMap.TRANSFER_NOT_FOUND).json({
        success: false,
        code: "TRANSFER_NOT_FOUND",
        msg: "Admin transfer not found",
      });
      return;
    }

    const transfer = transferRes.data;

    if (transfer.status !== "PENDING") {
      res.status(ErrorCodeMap.TRANSFER_NOT_FOUND).json({
        success: false,
        code: "TRANSFER_NOT_FOUND",
        msg: `Transfer is ${transfer.status.toLowerCase()}`,
      });
      return;
    }

    // Verify the current user is the intended recipient
    if (transfer.to_user_id !== userId) {
      res.status(ErrorCodeMap.UNAUTHORIZED_TRANSFER).json({
        success: false,
        code: "UNAUTHORIZED_TRANSFER",
        msg: "You are not the intended recipient of this transfer",
      });
      return;
    }

    // Check expiry
    if (new Date(transfer.expires_at) < new Date()) {
      await updateAdminTransferStatus(
        state.db,
        transfer.transfer_id,
        "EXPIRED",
      );
      res.status(ErrorCodeMap.TRANSFER_EXPIRED).json({
        success: false,
        code: "TRANSFER_EXPIRED",
        msg: "Admin transfer has expired",
      });
      return;
    }

    // Execute transfer in a transaction
    const client = await state.db.connect();
    try {
      await client.query("BEGIN");

      await updateCTDUserRole(
        client,
        transfer.to_user_id,
        transfer.customer_id,
        "admin",
      );

      await softDeleteCTDUser(
        client,
        transfer.from_user_id,
        transfer.customer_id,
      );

      await updateAdminTransferStatus(client, transfer.transfer_id, "ACCEPTED");

      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to execute admin transfer",
      });
      return;
    } finally {
      client.release();
    }

    res.status(200).json({
      success: true,
      data: { transfer_id: transfer.transfer_id },
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
