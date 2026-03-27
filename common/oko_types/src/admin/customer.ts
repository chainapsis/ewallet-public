import type { CustomerStatus } from "@oko-wallet/oko-types/customers";

export interface CreateCustomerUserRequest {
  email: string;
}

export type CreateCustomerWithDashboardUserRequest =
  CreateCustomerUserRequest & {
    label: string;
    url?: string;
    logo_url?: string;
  };

export interface CreateCustomerResponse {
  customer_id: string;
  label: string;
  status: CustomerStatus;
  url: string | null;
  logo_url: string | null;
  email: string;
  message: string;
}

export type DeleteCustomerRequest = {
  customer_id: string;
};

export type DeleteCustomerResponse = {
  customer_id: string;
  status: CustomerStatus;
};

export interface ResendCustomerUserPasswordRequest {
  customer_id: string;
  email: string;
}

export interface ResendCustomerUserPasswordResponse {
  message: string;
}
