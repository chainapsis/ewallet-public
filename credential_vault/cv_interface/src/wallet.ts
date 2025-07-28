import type { CurveType } from "./curve_type";

export interface CredentialVaultWallet {
  wallet_id: string;
  user_id: string;
  curve_type: CurveType;
  public_key: Buffer;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type CreateCredentialVaultWalletRequest = {
  user_id: string;
  curve_type: CurveType;
  public_key: Buffer;
};
