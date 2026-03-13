import type { WithTime } from "@oko-wallet-types/aux_types";
import type {
  KeyShareNode,
  KSNodeHealthCheck,
  KSNodeWithHealthCheck,
} from "@oko-wallet-types/tss";

export interface GetAllKSNodeResponse {
  ksNodes: KSNodeWithHealthCheck[];
}

export interface GetKSNodeResponse {
  ksNode: KeyShareNode;
}

export interface GetKSNodeByIdRequest {
  node_id: string;
}

export interface GetKSNodeByIdResponse {
  ksNode: KeyShareNode;
}

export interface GetKSNHealthChecksRequest {
  pageIndex: number;
  pageSize: number;
}

export interface GetKSNHealthChecksResponse {
  rows: WithTime<KSNodeHealthCheck>[];
  has_next: boolean;
}

export interface CreateKSNodeRequest {
  node_name: string;
  server_url: string;
}

export interface CreateKSNodeResponse {
  node_id: string;
}

export interface UpdateKSNodeRequest {
  node_id: string;
  server_url: string;
}

export interface UpdateKSNodeResponse {
  node_id: string;
}

export interface DeactivateKSNodeRequest {
  node_id: string;
}

export interface DeactivateKSNodeResponse {
  node_id: string;
}

export interface ActivateKSNodeRequest {
  node_id: string;
}

export interface ActivateKSNodeResponse {
  node_id: string;
}

export interface DeleteKSNodeRequest {
  node_id: string;
}

export interface DeleteKSNodeResponse {
  node_id: string;
}
