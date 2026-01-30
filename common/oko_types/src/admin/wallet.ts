export interface GetWalletListRequest {
  limit: number;
  offset: number;
}

export interface WalletWithEmailAndKSNodesResponse {
  public_key: string;
  email: string;
  auth_type: string;
  wallet_id: string;
  wallet_ks_nodes: string[];
}

export interface GetWalletListResponse {
  wallets: WalletWithEmailAndKSNodesResponse[];
  pagination: {
    total: number;
    current_page: number;
    total_pages: number;
  };
}

export interface UserWithWalletsResponse {
  user_id: string;
  auth_type: string;
  email: string;
  secp256k1_public_key: string | null;
  secp256k1_wallet_id: string | null;
  secp256k1_ks_nodes: string[];
  ed25519_public_key: string | null;
  ed25519_wallet_id: string | null;
  ed25519_ks_nodes: string[];
}

export interface GetUserListRequest {
  limit: number;
  offset: number;
}

export interface GetUserListResponse {
  users: UserWithWalletsResponse[];
  pagination: {
    total: number;
    current_page: number;
    total_pages: number;
  };
}
