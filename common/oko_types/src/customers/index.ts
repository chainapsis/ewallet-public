import type { APIKey } from "../ct_dashboard/api_key";
import type { CustomerDashboardUserWithReminderStatus } from "../ct_dashboard/customer_dashboard_user";

export type CustomerStatus = "ACTIVE" | "DELETED";

export interface Customer {
  customer_id: string;
  label: string;
  status: CustomerStatus;
  url: string | null;
  logo_url: string | null;
}

export type GetCustomerRequest = { customer_id: string };

export interface DeleteCustomerAndCustomerDashboardUsersRequest {
  customer_id: string;
}

export interface DeleteCustomerAndCustomerDashboardUsersResponse {
  customer_id: string;
  customer_dashboard_user_ids: string[];
}

export interface CustomerWithAPIKeys {
  customer: Customer;
  customer_dashboard_users: CustomerDashboardUserWithReminderStatus[];
  api_keys: APIKey[];
  has_tss_sessions?: boolean;
}

export interface UpdateCustomerInfoRequest {
  label?: string;
  url?: string;
  delete_logo?: string; // "true" to delete logo
}

export interface UpdateCustomerInfoResponse {
  message: string;
}
