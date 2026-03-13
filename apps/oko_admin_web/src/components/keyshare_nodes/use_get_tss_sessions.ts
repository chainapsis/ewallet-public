import type { TssSessionWithCustomerAndUser } from "@oko-wallet/oko-types/tss";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getTSSSessionsList } from "@oko-wallet-admin/fetch/tss";
import { useAppState } from "@oko-wallet-admin/state";

const DEFAULT_PAGE_SIZE = 10;

type UseGetTSSSessionsListProps = {
  page?: number;
  nodeId?: string;
};

export function useGetTSSSessionsList({
  page = 0,
  nodeId,
}: UseGetTSSSessionsListProps) {
  const { token } = useAppState();

  return useQuery<{
    tss_sessions: TssSessionWithCustomerAndUser[];
    pagination: {
      has_next: boolean;
      has_prev: boolean;
    };
  }>({
    queryKey: ["tss_sessions_list", token, page, nodeId],
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
      });

      if (!response.success) {
        throw new Error(response.msg);
      }

      return response.data;
    },
  });
}
