import { hashPassword } from "@oko-wallet/crypto-js";
import type { OkoAdminUser } from "@oko-wallet/oko-types/admin";
import type {
  CustomerAndCTDUserWithPasswordHash,
  CustomerDashboardUser,
  PasswordHash,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Customer } from "@oko-wallet/oko-types/customers";
import type { KeyShareNodeMeta } from "@oko-wallet/oko-types/key_share_node_meta";
import { v4 as uuidv4 } from "uuid";

import type { TssActivationSetting } from "@oko-wallet-types/tss_activate";

export const ADMIN_EMAIL = "admin@keplr.app";
export const ADMIN_PASSWORD = "0000";
export const ADMIN_USER_ID = "ed505add-4bd9-494d-afe4-943f9a3644de";

export const CUSTOMER_ID = "afb0afd1-d66d-4531-981c-cbf3fb1507b9";

export const CUSTOMER_DASHBOARD_USER_ID =
  "ea946605-f6a2-461c-9698-7604018c48c4";
export const CUSTOMER_DASHBOARD_USER_EMAIL = "demo@keplr.app";
export const CUSTOMER_DASHBOARD_USER_PASSWORD = "00000000";

export const API_KEY =
  "72bd2afd04374f86d563a40b814b7098e5ad6c7f52d3b8f84ab0c3d05f73ac6c";

export function createKeyShareNodeMeta(): KeyShareNodeMeta {
  return {
    sss_threshold: 2,
  };
}

export async function createAdmin(): Promise<OkoAdminUser> {
  return {
    user_id: ADMIN_USER_ID,
    email: ADMIN_EMAIL,
    password_hash: await hashPassword(ADMIN_PASSWORD),
    role: "admin",
    is_active: true,
  };
}

export function createCustomer(): Customer {
  return {
    customer_id: CUSTOMER_ID,
    status: "ACTIVE",
    label: "demo_web",
    url: `http://localhost:3200`,
    logo_url: "",
    theme: "system",
  };
}

export async function createCustomerDashboardUser(): Promise<
  CustomerDashboardUser & PasswordHash
> {
  return {
    user_id: CUSTOMER_DASHBOARD_USER_ID,
    customer_id: CUSTOMER_ID,
    email: CUSTOMER_DASHBOARD_USER_EMAIL,
    status: "ACTIVE",
    is_email_verified: true,
    password_hash: await hashPassword(CUSTOMER_DASHBOARD_USER_PASSWORD),
  };
}

export function createApiKeys(): {
  customer_id: string;
  hashed_key: string;
}[] {
  return [
    {
      customer_id: CUSTOMER_ID,
      hashed_key: API_KEY,
    },
  ];
}

export async function createDummyCustomerSets(): Promise<
  CustomerAndCTDUserWithPasswordHash[]
> {
  const ret = [];
  for (let i = 0; i < 100; i++) {
    const customer_id = uuidv4();
    const customer: CustomerAndCTDUserWithPasswordHash = {
      customer_id,
      status: "ACTIVE",
      label: `demo_customer_${i + 1}`,
      url: `http://localhost:${3000 + i}`,
      logo_url: "",
      user: {
        customer_id,
        user_id: uuidv4(),
        email: `demo_user_${i + 1}@keplr.app`,
        status: "ACTIVE",
        is_email_verified: true,
        password_hash: await hashPassword(`0000`),
      },
      theme: "system",
    };
    ret.push(customer);
  }
  return ret;
}

export function createDummyTssSessionsRequest(
  customerId: string,
  walletId: string,
) {
  const ret = [];
  for (let i = 0; i < 2; i++) {
    const tss_session = {
      wallet_id: walletId,
      customer_id: customerId,
    };
    ret.push(tss_session);
  }
  return ret;
}

export function createDummyOkoUsers(): string[] {
  return Array.from({ length: 15 }).map((_, i) => `testuser${i + 1}@test.com`);
}

export function createTssActivationSettings(): TssActivationSetting {
  return {
    activation_key: "tss_all",
    is_enabled: true,
    description: "Master switch for all TSS operations",
    updated_at: new Date(),
  };
}
