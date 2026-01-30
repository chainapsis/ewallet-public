import type {
  GetTssSessionListRequest,
  GetTssSessionListResponse,
  GetTssAllActivationSettingResponse,
  SetTssAllActivationSettingRequest,
  SetTssAllActivationSettingResponse,
} from "@oko-wallet/oko-types/admin";

import { doFetch } from "@oko-wallet-admin/fetch/fetcher";
import { OKO_ADMIN_API_ENDPOINT_V1 } from "@oko-wallet-admin/fetch";

export async function getTSSSessionsList({
  token,
  limit = 10,
  offset = 0,
  node_id,
  customer_id,
  curve_type,
}: {
  token: string;
  limit?: number;
  offset?: number;
  node_id?: string;
  customer_id?: string;
  curve_type?: string;
}) {
  const body: GetTssSessionListRequest = {
    limit,
    offset,
    node_id,
    customer_id,
    curve_type,
  };

  return doFetch<GetTssSessionListResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/tss/get_tss_session_list`,
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

export async function getTssAllActivationSetting({ token }: { token: string }) {
  return doFetch<GetTssAllActivationSettingResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/tss/get_tss_all_activation_setting`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function setTssAllActivationSetting({
  token,
  is_enabled,
}: {
  token: string;
  is_enabled: boolean;
}) {
  const body: SetTssAllActivationSettingRequest = {
    is_enabled,
  };

  return doFetch<SetTssAllActivationSettingResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/tss/set_tss_all_activation_setting`,
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
