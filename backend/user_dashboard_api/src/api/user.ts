import { getWalletById } from "@oko-wallet/oko-pg-interface/oko_wallets";
import { getConnectionsByUserId } from "@oko-wallet/oko-pg-interface/user_customer_connections";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { ConnectedApp } from "@oko-wallet/oko-types/user_dashboard";
import type { Pool } from "pg";

export async function getConnectedAppsRequest(
  db: Pool,
  walletIdSecp256k1: string,
): Promise<OkoApiResponse<ConnectedApp[]>> {
  try {
    const walletRes = await getWalletById(db, walletIdSecp256k1);
    if (!walletRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: walletRes.err,
      };
    }

    if (!walletRes.data) {
      return {
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "Wallet not found",
      };
    }

    const userId = walletRes.data.user_id;

    const connectionsRes = await getConnectionsByUserId(db, userId);
    if (!connectionsRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: connectionsRes.err,
      };
    }

    const apps: ConnectedApp[] = connectionsRes.data.map((connection) => ({
      customer_id: connection.customer_id,
      label: connection.label,
      logo_url: connection.logo_url,
      url: connection.url,
      connected_at: connection.created_at.toISOString(),
      state: connection.state,
    }));

    return {
      success: true,
      data: apps,
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `getConnectedAppsRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
