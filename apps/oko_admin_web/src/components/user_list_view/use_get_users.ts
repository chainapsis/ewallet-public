import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { GetUserListResponse } from "@oko-wallet/oko-types/admin";

import { getUserList } from "@oko-wallet-admin/fetch/wallet";
import { useAppState } from "@oko-wallet-admin/state";

const DEFAULT_PAGE_SIZE = 10;

export function useGetUsers(page: number = 0) {
  const { token } = useAppState();

  return useQuery<GetUserListResponse>({
    queryKey: ["users_list", token, page],
    enabled: !!token,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!token) {
        throw new Error("Token is not found");
      }

      const offset = page * DEFAULT_PAGE_SIZE;

      const response = await getUserList({
        token,
        offset,
      });

      if (!response.success) {
        throw new Error(response.msg);
      }

      return response.data;
    },
  });
}
