import type { GetWalletListResponse } from "@oko-wallet/oko-types/admin";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getWalletList } from "@oko-wallet-admin/fetch/wallet";
import { useAppState } from "@oko-wallet-admin/state";

const DEFAULT_PAGE_SIZE = 10;

export function useGetWallets(page: number = 0) {
  const { token } = useAppState();

  return useQuery<GetWalletListResponse>({
    queryKey: ["wallets_list", token, page],
    enabled: !!token,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!token) {
        throw new Error("Token is not found");
      }

      const offset = page * DEFAULT_PAGE_SIZE;

      const response = await getWalletList({
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
