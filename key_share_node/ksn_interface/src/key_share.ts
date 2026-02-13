import type { Bytes32, Bytes33, Bytes64 } from "@oko-wallet/bytes";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import type { CurveType } from "./curve_type";

// ============================================================================
// Common Types
// ============================================================================

export type PublicKeyBytes = Bytes32 | Bytes33;

export type KeyShareStatus = "active" | "inactive";

export interface KeyShare {
  share_id: string;
  wallet_id: string;
  enc_share: Buffer;
  created_at: Date;
  updated_at: Date;
  aux?: Record<string, any>;
  status: KeyShareStatus;
  reshared_at?: Date;
}

export type CreateKeyShareRequest = {
  wallet_id: string;
  enc_share: Buffer;
};

export type UpdateKeyShareRequest = {
  wallet_id: string;
  enc_share: Buffer;
  status: KeyShareStatus;
};

/**
 * Key share registration request for KS node.
 *
 * Share format by curve_type (both are 64 bytes):
 *
 * secp256k1:
 *   Point256 { x: 32 bytes, y: 32 bytes }
 *   - Elliptic curve point coordinates
 *
 * ed25519 (TEDDSA):
 *   TeddsaKeyShare { identifier: 32 bytes, signing_share: 32 bytes }
 *   - identifier: SSS x-coordinate (node_name SHA256 hash, byte[31] &= 0x0F)
 *   - signing_share: SSS y-coordinate (split signing share)
 *   - Note: verifying_share is recovered from signing_share via scalar_base_mult
 */
export interface RegisterKeyShareRequest {
  user_auth_id: string;
  auth_type: AuthType;
  curve_type: CurveType;
  public_key: Bytes32 | Bytes33;
  share: Bytes64;
}

export type RegisterKeyShareBody = {
  curve_type: CurveType;
  public_key: string; // hex string
  share: string;
};

export interface GetKeyShareRequest {
  user_auth_id: string;
  auth_type: AuthType;
  curve_type: CurveType;
  public_key: Bytes32 | Bytes33;
}

export interface GetKeyShareResponse {
  share_id: string;
  share: string;
}

export type GetKeyShareRequestBody = {
  curve_type: CurveType;
  public_key: string; // hex string
};

export interface CheckKeyShareRequest {
  user_auth_id: string;
  auth_type: AuthType;
  curve_type: CurveType;
  public_key: Bytes32 | Bytes33;
}

export interface CheckKeyShareResponse {
  exists: boolean;
}

export interface CheckKeyShareRequestBody {
  user_auth_id: string;
  auth_type?: AuthType;
  curve_type: CurveType;
  public_key: string; // hex string
}

/**
 * Key share reshare request for KS node.
 *
 * Share format is same as RegisterKeyShareRequest (64 bytes).
 * See RegisterKeyShareRequest for detailed format by curve_type.
 */
export interface ReshareKeyShareRequest {
  user_auth_id: string;
  auth_type: AuthType;
  curve_type: CurveType;
  public_key: Bytes32 | Bytes33;
  share: Bytes64;
}

export type ReshareKeyShareBody = {
  curve_type: CurveType;
  public_key: string; // hex string
  share: string; // hex string
};

// ============================================================================
// v2 API Types
// ============================================================================

/**
 * v2 wallets object type (internal, with Bytes)
 * Key: curve_type, Value: public_key (Bytes)
 */
export type WalletsRequest = {
  secp256k1?: Bytes33;
  ed25519?: Bytes32;
};

/**
 * v2 wallets object type (body, with hex string)
 * Key: curve_type, Value: public_key (hex string)
 */
export type WalletsRequestBody = {
  secp256k1?: string; // hex string, 33 bytes
  ed25519?: string; // hex string, 32 bytes
};

// --- GET /v2/keyshare ---

export interface GetKeyShareV2Request {
  user_auth_id: string;
  auth_type: AuthType;
  wallets: WalletsRequest;
}

export interface GetKeyShareV2RequestBody {
  auth_type: AuthType;
  wallets: WalletsRequestBody;
}

export interface Secp256k1KeyShareV2Response {
  share_id: string;
  share: string; // hex string (decrypted)
}

export interface Ed25519KeyShareV2Response {
  share_id: string;
  share: string; // hex string (decrypted)
  seed_share: string; // hex string (decrypted)
}

export type GetKeyShareV2Response = {
  secp256k1?: Secp256k1KeyShareV2Response;
  ed25519?: Ed25519KeyShareV2Response;
};

// --- POST /v2/keyshare/check ---

export interface CheckKeyShareV2Request {
  user_auth_id: string;
  auth_type: AuthType;
  wallets: WalletsRequest;
}

export interface CheckKeyShareV2RequestBody {
  user_auth_id: string;
  auth_type: AuthType;
  wallets: WalletsRequestBody;
}

export interface CheckKeyShareV2ResponseWallet {
  exists: boolean;
}

export type CheckKeyShareV2Response = {
  secp256k1?: CheckKeyShareV2ResponseWallet;
  ed25519?: CheckKeyShareV2ResponseWallet;
};

// --- POST /v2/keyshare/register ---

export type Secp256k1WalletRegisterInfo = {
  public_key: Bytes33;
  share: Bytes64;
};

export type Ed25519WalletRegisterInfo = {
  public_key: Bytes32;
  share: Bytes64;
  seed_share: string;
};

export type WalletsRegisterRequest = {
  secp256k1?: Secp256k1WalletRegisterInfo;
  ed25519?: Ed25519WalletRegisterInfo;
};

export type Secp256k1WalletRegisterInfoBody = {
  public_key: string; // hex string
  share: string; // hex string (64 bytes)
};

export type Ed25519WalletRegisterInfoBody = {
  public_key: string; // hex string
  share: string; // hex string (64 bytes)
  seed_share: string;
};

export type WalletsRegisterRequestBody = {
  secp256k1?: Secp256k1WalletRegisterInfoBody;
  ed25519?: Ed25519WalletRegisterInfoBody;
};

export interface RegisterKeyShareV2Request {
  user_auth_id: string;
  auth_type: AuthType;
  wallets: WalletsRegisterRequest;
}

export interface RegisterKeyShareV2RequestBody {
  auth_type: AuthType;
  wallets: WalletsRegisterRequestBody;
}

// --- POST /v2/keyshare/register/ed25519 ---

/**
 * Request for registering ed25519 wallet for existing users
 * User must already have secp256k1 wallet
 */
export interface RegisterEd25519V2Request {
  user_auth_id: string;
  auth_type: AuthType;
  public_key: Bytes32;
  share: Bytes64;
  seed_share: string;
}

export interface RegisterEd25519V2RequestBody {
  auth_type: AuthType;
  public_key: string; // hex string, 32 bytes
  share: string; // hex string, 64 bytes
  seed_share: string;
}

// --- POST /v2/keyshare/reshare ---

export type Secp256k1WalletReshareInfo = {
  public_key: Bytes33;
  share: Bytes64;
};

export type Ed25519WalletReshareInfo = {
  public_key: Bytes32;
  share: Bytes64;
  seed_share: string;
};

export type WalletsReshareRequest = {
  secp256k1: Secp256k1WalletReshareInfo;
  ed25519: Ed25519WalletReshareInfo;
};

export type Secp256k1WalletReshareInfoBody = {
  public_key: string; // hex string
  share: string; // hex string (64 bytes)
};

export type Ed25519WalletReshareInfoBody = {
  public_key: string; // hex string
  share: string; // hex string (64 bytes)
  seed_share: string;
};

export type WalletsReshareRequestBody = {
  secp256k1: Secp256k1WalletReshareInfoBody;
  ed25519: Ed25519WalletReshareInfoBody;
};

export interface ReshareKeyShareV2Request {
  user_auth_id: string;
  auth_type: AuthType;
  wallets: WalletsReshareRequest;
}

export interface ReshareKeyShareV2RequestBody {
  auth_type: AuthType;
  wallets: WalletsReshareRequestBody;
}

// --- Internal Helper Types ---

export type CheckWalletResult = { exists: boolean } | { error: string };

// ============================================================================
// v2 API Types with Commit-Reveal
// ============================================================================

/**
 * Commit-reveal fields for KSN v2 API requests.
 * Optional fields to support commit-reveal authentication scheme.
 */
export interface CommitRevealFields {
  cr_session_id?: string;
  cr_signature?: string;
}

/**
 * GET /v2/keyshare request body with commit-reveal fields
 */
export type GetKeyShareV2WithCRRequestBody = GetKeyShareV2RequestBody &
  CommitRevealFields;

/**
 * POST /v2/keyshare/register request body with commit-reveal fields
 */
export type RegisterKeyShareV2WithCRRequestBody =
  RegisterKeyShareV2RequestBody & CommitRevealFields;

/**
 * POST /v2/keyshare/register/ed25519 request body with commit-reveal fields
 */
export type RegisterEd25519V2WithCRRequestBody = RegisterEd25519V2RequestBody &
  CommitRevealFields;

/**
 * POST /v2/keyshare/reshare request body with commit-reveal fields
 */
export type ReshareKeyShareV2WithCRRequestBody = ReshareKeyShareV2RequestBody &
  CommitRevealFields;
