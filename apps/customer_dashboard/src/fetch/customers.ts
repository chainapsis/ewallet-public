import type { APIKey } from "@oko-wallet/oko-types/ct_dashboard";
import type {
  Customer,
  CustomerTheme,
  UpdateCustomerInfoResponse,
} from "@oko-wallet/oko-types/customers";

import { OKO_API_ENDPOINT } from ".";
import { errorHandle } from "./utils";

export const CUSTOMER_V1_ENDPOINT = `${OKO_API_ENDPOINT}/customer_dashboard/v1`;

export async function requestGetCustomerInfo({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  return errorHandle<Customer>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/info`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    }),
  );
}

export async function requestGetCustomerAPIKeys({
  token,
  email,
  customer_id,
}: {
  token: string;
  email: string;
  customer_id: string;
}) {
  return errorHandle<APIKey[]>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/api_keys`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, customer_id }),
    }),
  );
}

export async function requestCreateAPIKey({
  token,
}: {
  token: string;
}) {
  return errorHandle<APIKey>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/api_keys/create`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }),
  );
}

export async function requestDeleteAPIKey({
  token,
  key_id,
}: {
  token: string;
  key_id: string;
}) {
  return errorHandle<{ key_id: string }>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/api_keys/delete`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key_id }),
    }),
  );
}

export async function requestUpdateCustomerInfo({
  token,
  label,
  url,
  logoFile,
  deleteLogo,
  theme,
}: {
  token: string;
  label?: string;
  url?: string;
  logoFile?: File | null;
  deleteLogo?: boolean;
  theme?: CustomerTheme;
}) {
  // Note: Reasons for using FormData:
  // - Need to send file upload (logo) and text data together
  // - `multipart/form-data` format allows server to handle files and data simultaneously
  const formData = new FormData();

  if (label !== undefined && label.trim() !== "") {
    formData.append("label", label);
  }

  if (url !== undefined) {
    formData.append("url", url);
  }

  if (logoFile) {
    formData.append("logo", logoFile);
  }

  if (deleteLogo) {
    formData.append("delete_logo", "true");
  }

  if (theme !== undefined) {
    formData.append("theme", theme);
  }

  return errorHandle<UpdateCustomerInfoResponse>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/update_info`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }),
  );
}
