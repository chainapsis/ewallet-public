import type { Customer, CustomerStatus } from "@oko-wallet/oko-types/customers";

export type CustomerDashboardUserStatus = "ACTIVE" | "DELETED";

export interface GetCustomerAccountPayload {
  account_id: string;
}

export type AddCustomerRequest = {
  customer_id: string;
  email: string;
  status: CustomerStatus;
  is_email_verified: boolean;
  password_hash: string;
};

export type CustomerDashboardUserRole = "admin" | "member";

export interface CustomerDashboardUser {
  customer_id: string;
  user_id: string;
  email: string;
  role: CustomerDashboardUserRole;
  status: CustomerDashboardUserStatus;
  is_email_verified: boolean;
}

export interface CustomerDashboardUserReminderStatus {
  has_sent_inactive_reminder: boolean;
  has_sent_unverified_reminder: boolean;
}

export type CustomerDashboardUserWithReminderStatus = {
  customer_id: string;
  user_id: string;
  email: string;
  status: CustomerDashboardUserStatus;
  is_email_verified: boolean;
  has_sent_inactive_reminder: boolean;
  has_sent_unverified_reminder: boolean;
};

export interface PasswordHash {
  password_hash: string;
}

export type CustomerAndCTDUser = Customer & {
  user: CustomerDashboardUser;
};

export type CustomerAndCTDUserWithPasswordHash = Customer & {
  user: CustomerDashboardUser & PasswordHash;
};

export type GetCustomerAccountRequest = { user_id: string };

export type GetCustomerAccountByEmailRequest = {
  email: string;
};

export type UpdateCustomerAccountPasswordRequest = {
  user_id: string;
  password_hash: string;
};

export type UpdateCustomerAccountPasswordReseponse = {
  user_id: string;
};

export type VerifyCustomerAccountEmailRequest = {
  user_id: string;
};

export type VerifyCustomerAccountEmailResponse = {
  user_id: string;
  is_email_verified: boolean;
};

export interface SendVerificationResponse {
  message: string;
  expires_at: string;
}

export interface LoginResponse {
  token: string;
  customer: {
    email: string;
    is_email_verified: boolean;
  };
}

export type InsertCustomerDashboardUserRequest = CustomerDashboardUser &
  PasswordHash;

export type InsertCustomerDashboardUserResponse = CustomerDashboardUser;

export type DeleteCustomerDashboardUsersByCustomerIdRequest = {
  customer_id: string;
};

export type DeleteCustomerDashboardUsersByCustomerIdResponse = {
  customer_id: string;
  customer_dashboard_user_ids: string[];
  status: CustomerDashboardUserStatus;
};
