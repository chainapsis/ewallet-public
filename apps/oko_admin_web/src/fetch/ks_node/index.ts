import type {
  CreateKSNodeRequest,
  CreateKSNodeResponse,
  DeactivateKSNodeRequest,
  DeactivateKSNodeResponse,
  DeleteKSNodeRequest,
  DeleteKSNodeResponse,
  GetKSNodeByIdResponse,
  UpdateKeyShareNodeMetaRequest,
  UpdateKeyShareNodeMetaResponse,
  UpdateKSNodeRequest,
  UpdateKSNodeResponse,
} from "@oko-wallet/oko-types/admin";

import { OKO_ADMIN_API_ENDPOINT_V1 } from "@oko-wallet-admin/fetch";
import { doFetch } from "@oko-wallet-admin/fetch/fetcher";

export type GetKSNodesParams = {
  token: string;
};

export type GetKSNodeByIdParams = {
  token: string;
  node_id: string;
};

export type CreateKSNodeParams = {
  token: string;
  node_name: string;
  server_url: string;
};

export type DeactivateKSNodeParams = {
  token: string;
  node_id: string;
};

export type DeleteKSNodeParams = {
  token: string;
  node_id: string;
};

export type UpdateKSNodeParams = {
  token: string;
  node_id: string;
  server_url: string;
};

export type ActivateKSNodeParams = {
  token: string;
  node_id: string;
};

export async function getKSNodeById({ token, node_id }: GetKSNodeByIdParams) {
  return doFetch<GetKSNodeByIdResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/ks_node/get_ks_node_by_id`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ node_id }),
    },
  );
}

export async function createKeyShareNode({
  token,
  node_name,
  server_url,
}: CreateKSNodeParams) {
  const body: CreateKSNodeRequest = {
    node_name,
    server_url,
  };

  return doFetch<CreateKSNodeResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/ks_node/create_ks_node`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
}

export async function deactivateKeyShareNode({
  token,
  node_id,
}: DeactivateKSNodeParams) {
  const body: DeactivateKSNodeRequest = {
    node_id,
  };

  return doFetch<DeactivateKSNodeResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/ks_node/deactivate_ks_node`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
}

export async function deleteKeyShareNode({
  token,
  node_id,
}: DeleteKSNodeParams) {
  const body: DeleteKSNodeRequest = {
    node_id,
  };

  return doFetch<DeleteKSNodeResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/ks_node/delete_ks_node`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
}

export async function updateKeyShareNode({
  token,
  node_id,
  server_url,
}: UpdateKSNodeParams) {
  const body: UpdateKSNodeRequest = {
    node_id,
    server_url,
  };

  return doFetch<UpdateKSNodeResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/ks_node/update_ks_node`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
}

export type UpdateKeyShareNodeMetaParams = {
  token: string;
  registration_threshold: number | null;
};

export async function updateKeyShareNodeMeta({
  token,
  registration_threshold,
}: UpdateKeyShareNodeMetaParams) {
  const body: UpdateKeyShareNodeMetaRequest = {
    registration_threshold,
  };

  return doFetch<UpdateKeyShareNodeMetaResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/ks_node/update_ks_node_meta`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
}

export async function activateKeyShareNode({
  token,
  node_id,
}: ActivateKSNodeParams) {
  const body = {
    node_id,
  };

  return doFetch<{ node_id: string }>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/ks_node/activate_ks_node`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
}
