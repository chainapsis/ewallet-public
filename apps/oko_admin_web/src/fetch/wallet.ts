import type {
  GetWalletListRequest,
  GetWalletListResponse,
  GetUserListRequest,
  GetUserListResponse,
} from "@oko-wallet/oko-types/admin";

import { doFetch } from "./fetcher";
import { OKO_ADMIN_API_ENDPOINT_V1 } from ".";

export async function getWalletList({
  token,
  limit = 10,
  offset = 0,
}: {
  token: string;
  limit?: number;
  offset?: number;
}) {
  const body: GetWalletListRequest = {
    limit,
    offset,
  };

  return doFetch<GetWalletListResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/wallet/get_wallet_list`,
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

export async function getUserList({
  token,
  limit = 10,
  offset = 0,
}: {
  token: string;
  limit?: number;
  offset?: number;
}) {
  const body: GetUserListRequest = {
    limit,
    offset,
  };

  return doFetch<GetUserListResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/wallet/get_user_list`,
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
