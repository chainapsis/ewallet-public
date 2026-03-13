import { useQuery } from "@tanstack/react-query";

import { OKO_ADMIN_API_ENDPOINT_V1 } from "..";
import { doFetch } from "../fetcher";
import type { GetKSNodesParams } from "./";
// import { getAllKeyShareNodes } from "@oko-wallet-admin/fetch/ks_node";
import { useAppState } from "@oko-wallet-admin/state";
import type { GetAllKSNodeResponse } from "@oko-wallet-types/admin";

export function useAllKeyShareNodes() {
  const { token } = useAppState();

  return useQuery({
    queryKey: ["all-ks-nodes"],
    queryFn: async () => {
      if (!token) {
        throw new Error("Token is not found");
      }

      const response = await getAllKeyShareNodes({ token });

      if (!response.success) {
        throw new Error(response.msg);
      }

      return response.data;
    },
  });
}

async function getAllKeyShareNodes({ token }: GetKSNodesParams) {
  return doFetch<GetAllKSNodeResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/ks_node/get_all_ks_nodes`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
}
