import type { CustomerTheme } from "@oko-wallet/oko-types/customers";
import type { Result } from "@oko-wallet/stdlib-js";

import { OKO_API_ENDPOINT } from "./endpoints";
import type { FetchError } from "./types";

export async function getThemeByHostOrigin(
  hostOrigin: string,
): Promise<Result<CustomerTheme, FetchError>> {
  try {
    const res = await fetch(
      `${OKO_API_ENDPOINT}/attached/v1/theme/get?host_origin=${encodeURIComponent(hostOrigin)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      return {
        success: false,
        err: {
          type: "status_fail",
          status: res.status,
        },
      };
    }

    try {
      const result = (await res.json()).data;
      return { success: true, data: result };
    } catch (err: any) {
      return {
        success: false,
        err: { type: "json_parse_fail", err },
      };
    }
  } catch (err: any) {
    return {
      success: false,
      err: {
        type: "fetch_error",
        err,
      },
    };
  }
}
