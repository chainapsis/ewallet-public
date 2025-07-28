import type { CurveType } from "./curve_type";

export interface CredentialVaultKeyShare {
  share_id: string;
  wallet_id: string;
  enc_share: Buffer;
  created_at: Date;
  updated_at: Date;
}

export type CreateCredentialVaultKeyShareRequest = {
  wallet_id: string;
  enc_share: Buffer;
};

export interface RegisterKeyShareRequest {
  email: string;
  curve_type: CurveType;
  public_key: string; // hex string
  enc_share: string; // hex string
}

export type RegisterKeyShareBody = {
  curve_type: CurveType;
  public_key: string; // hex string
  enc_share: string; // hex string
};

export interface GetKeyShareRequest {
  email: string;
  public_key: string; // hex string
}

export interface GetKeyShareResponse {
  share_id: string;
  enc_share: string; // hex string
}

export type GetKeyShareRequestBody = {
  public_key: string; // hex string
};
