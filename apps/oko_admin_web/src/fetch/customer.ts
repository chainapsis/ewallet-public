import type { CreateCustomerWithDashboardUserRequest } from "@oko-wallet/oko-types/admin";
import type {
  Customer,
  CustomerWithAPIKeys,
  DeleteCustomerAndCustomerDashboardUsersResponse,
} from "@oko-wallet/oko-types/customers";

import { OKO_ADMIN_API_ENDPOINT_V1 } from "@oko-wallet-admin/fetch";
import { doFetch } from "@oko-wallet-admin/fetch/fetcher";

export interface DeleteCustomerAndCTDUsersArgs {
  token: string;
  customer_id: string;
}

export async function getCustomerListWithAPIKeys({
  token,
  limit = 10,
  offset = 0,
}: {
  token: string;
  limit?: number;
  offset?: number;
}) {
  return doFetch<{
    customerWithAPIKeysList: CustomerWithAPIKeys[];
    pagination: {
      total: number;
      current_page: number;
      total_pages: number;
      verified_count: number;
      tx_active_count: number;
    };
  }>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/customer/get_customer_list?limit=${limit}&offset=${offset}`,
    {
      method: "GET",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function getCustomer({
  token,
  customer_id,
}: {
  token: string;
  customer_id: string;
}) {
  return doFetch<Customer>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/customer/get_customer/${customer_id}`,
    {
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function addCustomer({
  token,
  data,
}: {
  token: string;
  data: CreateCustomerWithDashboardUserRequest & { logo?: File };
}) {
  // Note: Reasons for using FormData:
  // - Need to send file upload (logo) and text data together
  // - `multipart/form-data` format allows server to handle files and data simultaneously
  const formData = new FormData();

  formData.append("email", data.email);
  formData.append("label", data.label);

  if (data.url) {
    formData.append("url", data.url);
  }

  if (data.logo) {
    formData.append("logo", data.logo);
  }

  return doFetch<any>(`${OKO_ADMIN_API_ENDPOINT_V1}/customer/create_customer`, {
    method: "POST",
    headers: {
      // browser automatically sets multipart/form-data
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

export async function deleteCustomerAndCTDUsers({
  token,
  customer_id,
}: DeleteCustomerAndCTDUsersArgs) {
  return doFetch<DeleteCustomerAndCustomerDashboardUsersResponse>(
    `${OKO_ADMIN_API_ENDPOINT_V1}/customer/delete_customer/${customer_id}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
}
