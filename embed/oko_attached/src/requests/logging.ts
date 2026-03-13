import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { PostLogBody, PostLogResponse } from "@oko-wallet/oko-types/log";
import type { Result } from "@oko-wallet/stdlib-js";

import { OKO_API_ENDPOINT } from "./endpoints";
import type { PostLogParams } from "@oko-wallet-attached/logging/types";
import type { FetchError } from "@oko-wallet-attached/requests/types";

export async function postLog(
  log: PostLogParams,
  option?: { console: boolean },
): Promise<Result<OkoApiResponse<PostLogResponse>, FetchError>> {
  if (option?.console) {
    if (log.level === "error") {
      console.error(log.message, log.error);
    } else {
      console.log(log.message);
    }
  }

  const browserInfo = getBrowserInfo();
  const completeLog: PostLogBody = {
    level: log.level,
    message: log.message,
    timestamp: new Date().toISOString(),
    error: log.level === "error" ? log.error : undefined,
    session: {
      pageUrl: browserInfo.pageUrl,
      ...log.session,
    },
    clientInfo: {
      userAgent: browserInfo.userAgent,
      platform: browserInfo.platform,
      screen: {
        width: browserInfo.screen.width,
        height: browserInfo.screen.height,
      },
    },
    meta: log.meta,
  };

  let resp: Response;
  try {
    resp = await fetch(`${OKO_API_ENDPOINT}/log/v1/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(completeLog),
    });
  } catch (err: any) {
    return { success: false, err: err.toString() };
  }

  if (!resp.ok) {
    return {
      success: false,
      err: { type: "status_fail", status: resp.status },
    };
  }

  try {
    const result = (await resp.json()) as OkoApiResponse<PostLogResponse>;
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, err: err.toString() };
  }
}

function getBrowserInfo(): {
  pageUrl: string;
  userAgent: string;
  platform: string;
  screen: {
    width: number;
    height: number;
  };
} {
  if (typeof window !== "undefined" && window.location) {
    return {
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screen: {
        width: screen.width,
        height: screen.height,
      },
    };
  } else {
    return {
      pageUrl: "unknown",
      userAgent: "unknown",
      platform: "unknown",
      screen: {
        width: 0,
        height: 0,
      },
    };
  }
}
