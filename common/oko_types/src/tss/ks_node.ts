export type KSNodeStatus = "ACTIVE" | "INACTIVE";

export type KSNodeHealthCheckStatus = "HEALTHY" | "UNHEALTHY";

export type WalletKSNodeStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "UNRECOVERABLE_DATA_LOSS"
  // not stored in db, only used for response
  | "NOT_REGISTERED";

export interface KeyShareNode {
  node_id: string;
  node_name: string;
  status: KSNodeStatus;
  server_url: string;
  created_at: string;
  updated_at: string;
}

export type KsNodeHealthStatus = "HEALTHY" | "UNHEALTHY";

// export interface KsNodeHealthCheck {
//   node_id: string;
//   status: KsNodeHealthStatus;
// }

export interface NodeStatusInfo {
  name: string;
  endpoint: string;
  wallet_status: WalletKSNodeStatus;
}

export interface KeyShareNodeMetaWithNodeStatusInfo {
  threshold: number;
  registration_threshold: number | null;
  nodes: NodeStatusInfo[];
}

export interface WalletKSNode {
  wallet_ks_node_id: string;
  wallet_id: string;
  node_id: string;
  status: WalletKSNodeStatus;
  created_at: string;
  updated_at: string;
}

export type WalletKSNodeWithNodeNameAndServerUrl = {
  wallet_ks_node_id: string;
  wallet_id: string;
  node_id: string;
  status: WalletKSNodeStatus;
  created_at: string;
  updated_at: string;
  node_name: string;
  server_url: string;
};

export interface KSNodeHealthCheck {
  check_id: string;
  node_id: string;
  status: KSNodeHealthCheckStatus;
}

export type KSNodeWithHealthCheck = {
  node_id: string;
  node_name: string;
  status: KSNodeStatus;
  server_url: string;
  created_at: string;
  updated_at: string;
  health_check_status: KSNodeHealthCheckStatus | null;
  health_checked_at: string | null;
};

export interface KSNodeTelemetry {
  log_id: string;
  public_key: string;
  key_share_count: number;
  payload: any;
  created_at: Date;
}

export interface KSNodeTelemetryRequest {
  public_key: string;
  key_share_count: number;
  payload: Record<string, any>;
}
