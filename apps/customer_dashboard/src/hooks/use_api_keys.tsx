import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCustomerInfo } from "./use_customer_info";
import {
  requestCreateAPIKey,
  requestDeleteAPIKey,
  requestGetCustomerAPIKeys,
} from "@oko-wallet-ct-dashboard/fetch/customers";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

export const useAPIKeys = () => {
  const user = useAppState((state) => state.user);
  const token = useAppState((state) => state.token);

  const { data: customer } = useCustomerInfo();

  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await requestGetCustomerAPIKeys({
        token: token ?? "",
        email: user?.email ?? "",
        customer_id: customer?.customer_id ?? "",
      });

      if (!res.success) {
        return [];
      }

      return res.data;
    },
    enabled: !!token && !!user?.email && !!customer,
  });
};

export const useCreateAPIKey = () => {
  const token = useAppState((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await requestCreateAPIKey({ token: token ?? "" });
      if (!res.success) {
        throw new Error(res.msg);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
};

export const useDeleteAPIKey = () => {
  const token = useAppState((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const res = await requestDeleteAPIKey({
        token: token ?? "",
        key_id: keyId,
      });
      if (!res.success) {
        throw new Error(res.msg);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
};
