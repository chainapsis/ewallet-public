import type {
  Customer,
  CustomerWithAPIKeys,
  GetCustomerRequest,
} from "@oko-wallet/oko-types/customers";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getCustomer,
  getCustomerListWithAPIKeys,
} from "@oko-wallet-admin/fetch/customer";
import { useAppState } from "@oko-wallet-admin/state";

const DEFAULT_PAGE_SIZE = 10;

export function useGetCustomerListWithAPIKeys(page: number = 0) {
  const { token } = useAppState();

  return useQuery<{
    customerWithAPIKeysList: CustomerWithAPIKeys[];
    pagination: {
      total: number;
      current_page: number;
      total_pages: number;
      verified_count: number;
      tx_active_count: number;
    };
  }>({
    queryKey: ["customer_list", token, page],
    enabled: !!token,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!token) {
        throw new Error("Token is not found");
      }

      const offset = page * DEFAULT_PAGE_SIZE;

      const response = await getCustomerListWithAPIKeys({
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

export function useGetCustomer({ customer_id }: GetCustomerRequest) {
  const { token } = useAppState();

  const query = useQuery<Customer>({
    queryKey: ["customer", customer_id],
    enabled: !!token,
    queryFn: async () => {
      if (!token) {
        throw new Error("Token is not found");
      }

      const response = await getCustomer({ token, customer_id });

      if (!response.success) {
        throw new Error(response.msg);
      }

      return response.data;
    },
  });

  return { ...query, data: query.data };
}
