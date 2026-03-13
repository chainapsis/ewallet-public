import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";

import { OKO_ADMIN_API_ENDPOINT_V1 } from "..";
import { doFetch } from "../fetcher";
import { useAppState } from "@oko-wallet-admin/state";
import type {
  GetKSNHealthChecksRequest,
  GetKSNHealthChecksResponse,
} from "@oko-wallet-types/admin";

export function useKSNHealthChecks(pagination: PaginationState) {
  const { token } = useAppState();

  return useQuery({
    queryKey: ["ksn-health-checks", pagination],
    queryFn: async () => {
      if (!token) {
        throw new Error("Token is not found");
      }

      const req: GetKSNHealthChecksRequest = {
        ...pagination,
      };

      const response = await doFetch<GetKSNHealthChecksResponse>(
        `${OKO_ADMIN_API_ENDPOINT_V1}/ks_node/get_ksn_health_checks`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(req),
        },
      );

      if (!response.success) {
        throw new Error(response.msg);
      }

      return response.data;
    },
  });
}
