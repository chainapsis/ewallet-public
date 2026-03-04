import type { CurveType } from "@oko-wallet/oko-types/crypto";

export interface KSNodeWallet {
  wallet_id: string;
  user_id: string;
  curve_type: CurveType;
  public_key: Buffer;
  aux?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type CreateKSNodeWalletRequest = {
  user_id: string;
  curve_type: CurveType;
  public_key: Uint8Array;
};
