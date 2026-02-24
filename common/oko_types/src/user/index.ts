import type { NodeNameAndEndpoint } from "../user_key_share";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "../tss/ks_node";
import type { OAuthRequest, AuthType } from "../auth";

export interface User {
  user_id: string;
  email: string;
  status: string;
  auth_type: AuthType;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CheckEmailRequest {
  email: string;
  auth_type?: AuthType;
}

export interface CheckEmailResponse {
  exists: boolean;
  keyshare_node_meta: KeyShareNodeMetaWithNodeStatusInfo;
  // Reshare signaling
  needs_reshare: boolean;
  reshare_reasons?: ReshareReason[];
  // Service-level signal when active nodes fall below SSS threshold
  active_nodes_below_threshold: boolean;
}

/**
 * Response when user does not exist or user exists but has no wallets.
 */
export interface CheckEmailResponseV2NotExists {
  exists: false;
  active_nodes_below_threshold: boolean;
  keyshare_node_meta: KeyShareNodeMetaWithNodeStatusInfo;
}

/**
 * Response when user exists with only secp256k1 wallet (legacy user).
 * Client should: 1) ed25519 keygen first, 2) reshare if needed
 */
export interface CheckEmailResponseV2NeedsEd25519Keygen {
  exists: true;
  needs_keygen_ed25519: true;
  keyshare_node_meta: KeyShareNodeMetaWithNodeStatusInfo;
  needs_reshare: boolean;
  reshare_reasons?: ReshareReason[];
  active_nodes_below_threshold: boolean;
}

/**
 * Response when user exists with both wallets.
 */
export interface CheckEmailResponseV2BothWallets {
  exists: true;
  keyshare_node_meta: KeyShareNodeMetaWithNodeStatusInfo;
  needs_reshare: boolean;
  reshare_reasons?: ReshareReason[];
  active_nodes_below_threshold: boolean;
}

export type CheckEmailResponseV2 =
  | CheckEmailResponseV2NotExists
  | CheckEmailResponseV2NeedsEd25519Keygen
  | CheckEmailResponseV2BothWallets;

export interface SignInRequest {
  auth_type: AuthType;
}

export interface SignInResponse {
  token: string;
  user: {
    wallet_id: string;
    public_key: string;
    user_identifier: string;
    email: string | null;
    name: string | null;
  };
}

export interface SignInResponseV2 {
  token: string;
  user: {
    wallet_id_secp256k1: string;
    wallet_id_ed25519: string;
    public_key_secp256k1: string;
    public_key_ed25519: string;
    server_verifying_share_ed25519: string;
    user_identifier: string;
    email: string | null;
    name: string | null;
  };
}

export interface ExportSharesRequest {
  first_login_jwt: string;
  auth_type: AuthType;
}

export interface ExportSharesResponse {
  secp256k1_share: string;
  ed25519_seed_share: string;
}

export interface SignInSilentlyResponse {
  token: string | null;
  // user: {
  //   email: string;
  //   wallet_id: string;
  //   public_key: string;
  // };
}

// Reason codes for triggering reshare
export type ReshareReason = "UNRECOVERABLE_NODE_DATA_LOSS" | "NEW_NODE_ADDED";

export interface ReshareRequest {
  public_key: string;
  reshared_key_shares: NodeNameAndEndpoint[];
}

export type ReshareRequestBody = OAuthRequest<ReshareRequest>;

/**
 * V2 Reshare request body for /tss/v2/user/reshare endpoint.
 */
export interface ReshareRequestV2 {
  auth_type: AuthType;
  secp256k1_public_key: string;
  ed25519_public_key: string;
  reshared_key_shares: NodeNameAndEndpoint[];
}

export interface SaveReferralRequest {
  origin: string;
  utm_source: string | null;
  utm_campaign: string | null;
}

export interface SaveReferralResponse {
  referral_id: string;
}

/**
 * HTTP request body for reporting key share not found.
 * Called when client receives KEY_SHARE_NOT_FOUND from nodes that were expected to be ACTIVE.
 */
export interface ReportKeyShareNotFoundBody {
  nodes: NodeNameAndEndpoint[];
}

/**
 * Internal service request for reporting key share not found.
 * Includes wallet IDs from JWT authentication.
 */
export interface ReportKeyShareNotFoundRequest {
  wallet_id_secp256k1: string;
  wallet_id_ed25519: string;
  nodes: NodeNameAndEndpoint[];
}

export interface ReportKeyShareNotFoundResponse {
  updated_count_secp256k1: number;
  updated_count_ed25519: number;
}

export { NodeNameAndEndpoint };
