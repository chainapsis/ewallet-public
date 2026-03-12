import { getCustomer } from "@oko-wallet/oko-pg-interface/customers";
import { getWalletByIdWithEmail } from "@oko-wallet/oko-pg-interface/oko_wallets";
import {
  updateTssSessionState,
  updateTssStage,
} from "@oko-wallet/oko-pg-interface/tss";
import type { Customer } from "@oko-wallet/oko-types/customers";
import type {
  TssStageStatus,
  TssStageWithSessionData,
  UpdateTssStageRequest,
} from "@oko-wallet/oko-types/tss";
import { TssSessionState } from "@oko-wallet/oko-types/tss";
import type { WalletWithEmail } from "@oko-wallet/oko-types/wallets";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool } from "pg";

export function validateTssSession(
  triplesStage: TssStageWithSessionData | null,
  walletId: string,
): boolean {
  return (
    triplesStage?.session_state === TssSessionState.IN_PROGRESS &&
    triplesStage?.wallet_id === walletId
  );
}

export function validateTssStage(
  triplesStage: TssStageWithSessionData | null,
  stageStatus: TssStageStatus,
): triplesStage is TssStageWithSessionData {
  return triplesStage !== null && triplesStage.stage_status === stageStatus;
}

export async function updateTssStageWithSessionState(
  db: Pool,
  stageId: string,
  sessionId: string,
  stageData: UpdateTssStageRequest,
  sessionState: TssSessionState,
): Promise<Result<void, string>> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const stageRes = await updateTssStage(client, stageId, stageData);
    if (!stageRes.success) {
      throw new Error(stageRes.err);
    }

    const sessionRes = await updateTssSessionState(
      client,
      sessionId,
      sessionState,
    );
    if (!sessionRes.success) {
      throw new Error(sessionRes.err);
    }

    await client.query("COMMIT");
    return { success: true, data: void 0 };
  } catch (err) {
    await client.query("ROLLBACK");
    return {
      success: false,
      err: `updateStageWithSessionState error: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    client.release();
  }
}

export async function validateWalletEmail(
  db: Pool,
  walletId: string,
  email: string,
): Promise<Result<WalletWithEmail, string>> {
  const getWalletRes = await getWalletByIdWithEmail(db, walletId);
  if (getWalletRes.success === false) {
    return {
      success: false,
      err: `getting wallet failed, err: ${getWalletRes.err}`,
    };
  }

  if (getWalletRes.data === null) {
    return {
      success: false,
      err: `Wallet not exists`,
    };
  }

  if (getWalletRes.data.email !== email) {
    return {
      success: false,
      err: `Email not corresponding`,
    };
  }

  return {
    success: true,
    data: getWalletRes.data,
  };
}

export async function validateWalletEmailAndCurveType(
  db: Pool,
  walletId: string,
  email: string,
  curveType: string,
): Promise<Result<WalletWithEmail, string>> {
  const getWalletRes = await getWalletByIdWithEmail(db, walletId);
  if (getWalletRes.success === false) {
    return {
      success: false,
      err: `getting wallet failed, err: ${getWalletRes.err}`,
    };
  }

  if (getWalletRes.data === null) {
    return {
      success: false,
      err: `Wallet not exists`,
    };
  }

  if (getWalletRes.data.email !== email) {
    return {
      success: false,
      err: `Email not corresponding`,
    };
  }

  if (getWalletRes.data.curve_type !== curveType) {
    return {
      success: false,
      err: `Curve type not corresponding`,
    };
  }

  return {
    success: true,
    data: getWalletRes.data,
  };
}

export async function validateCustomer(
  db: Pool,
  customerId: string,
): Promise<Result<Customer, string>> {
  const getCustomerRes = await getCustomer(db, customerId);
  if (getCustomerRes.success === false) {
    return {
      success: false,
      err: `getCustomer error: ${getCustomerRes.err}`,
    };
  }

  if (getCustomerRes.data === null) {
    return {
      success: false,
      err: `Customer not found`,
    };
  }

  if (getCustomerRes.data.customer_id !== customerId) {
    return {
      success: false,
      err: `Customer not found`,
    };
  }

  return {
    success: true,
    data: getCustomerRes.data,
  };
}

// TODO remove temp secret
export const TEMP_ENC_SECRET = "temp_enc_secret";
