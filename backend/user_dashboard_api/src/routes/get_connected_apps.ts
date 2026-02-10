import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/common";
import { CustomerAuthHeaderSchema } from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { getWalletById } from "@oko-wallet/oko-pg-interface/oko_wallets";
import { getConnectionsByUserId } from "@oko-wallet/oko-pg-interface/user_customer_connections";
import type { ConnectedApp } from "@oko-wallet/oko-types/user_dashboard";
import express, { type IRouter, type Response } from "express";
import type { Pool } from "pg";

import type { OkoApiResponse } from "@oko-wallet-types/api_response";
import {
  type UserAuthenticatedRequest,
  userJwtMiddleware,
} from "@oko-wallet-usrd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/user_dashboard/v1/get_connected_apps",
  tags: ["User Dashboard"],
  summary: "Get connected apps",
  description:
    "Retrieves connected applications for the authenticated user (uses TSS API JWT)",
  security: [{ userAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
  },
  responses: {
    200: {
      description: "Connected apps retrieved successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
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

export async function getConnectedApps(
  req: UserAuthenticatedRequest,
  res: Response<OkoApiResponse<ConnectedApp[]>>,
) {
  try {
    const state = req.app.locals as { db: Pool };
    const { wallet_id_secp256k1 } = res.locals.user as {
      email: string;
      wallet_id_secp256k1: string;
      wallet_id_ed25519: string;
    };

    const walletRes = await getWalletById(state.db, wallet_id_secp256k1);
    if (!walletRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: walletRes.err,
      });
      return;
    }

    if (!walletRes.data) {
      res.status(404).json({
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "Wallet not found",
      });
      return;
    }

    const userId = walletRes.data.user_id;

    const connectionsRes = await getConnectionsByUserId(state.db, userId);
    if (!connectionsRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: connectionsRes.err,
      });
      return;
    }

    const apps: ConnectedApp[] = connectionsRes.data.map((connection) => ({
      customer_id: connection.customer_id,
      label: connection.label,
      logo_url: connection.logo_url,
      url: connection.url,
      connected_at: connection.created_at.toISOString(),
      state: connection.state,
    }));

    res.status(200).json({
      success: true,
      data: apps,
    });
    return;
  } catch (error) {
    console.error("Get connected apps error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
