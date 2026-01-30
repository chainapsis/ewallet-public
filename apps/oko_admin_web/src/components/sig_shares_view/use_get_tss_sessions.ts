import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { TssSessionWithCustomerAndUser } from "@oko-wallet/oko-types/tss";

import { getTSSSessionsList } from "@oko-wallet-admin/fetch/tss";
import { useAppState } from "@oko-wallet-admin/state";

const DEFAULT_PAGE_SIZE = 10;

type UseGetTSSSessionsListProps = {
  page?: number;
  nodeId?: string;
  customerId?: string;
  curveType?: string;
};

export function useGetTSSSessionsList({
  page = 0,
  nodeId,
  customerId,
  curveType,
}: UseGetTSSSessionsListProps) {
  const { token } = useAppState();

  return useQuery<{
    tss_sessions: TssSessionWithCustomerAndUser[];
    pagination: {
      has_next: boolean;
      has_prev: boolean;
    };
  }>({
    queryKey: ["tss_sessions_list", token, page, nodeId, customerId, curveType],
    enabled: !!token,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!token) {
        throw new Error("Token is not found");
      }

      const offset = page * DEFAULT_PAGE_SIZE;

      const response = await getTSSSessionsList({
        token,
        offset,
        node_id: nodeId,
        customer_id: customerId,
        curve_type: curveType,
      });

      if (!response.success) {
        throw new Error(response.msg);
      }

      return response.data;
    },
  });
}
