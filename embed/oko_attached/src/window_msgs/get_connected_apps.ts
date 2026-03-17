import type { OkoWalletMsgGetConnectedAppsAck } from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import {
  OKO_API_ENDPOINT,
  USER_DASHBOARD_ORIGINS,
} from "@oko-wallet-attached/requests/endpoints";
import { useAppState } from "@oko-wallet-attached/store/app";

export async function handleGetConnectedApps(
  ctx: MsgEventContext,
): Promise<void> {
  const { port, hostOrigin, storageKey } = ctx;

  const allowedOrigins = USER_DASHBOARD_ORIGINS.split(",").map((o: string) =>
    o.trim(),
  );
  if (!allowedOrigins.includes(hostOrigin)) {
    const ack: OkoWalletMsgGetConnectedAppsAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__get_connected_apps_ack__",
      payload: { success: false, error: { type: "UNAUTHORIZED_ORIGIN" } },
    };
    port.postMessage(ack);
    return;
  }

  const authToken = useAppState.getState().getAuthToken(storageKey);
  if (!authToken) {
    const ack: OkoWalletMsgGetConnectedAppsAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__get_connected_apps_ack__",
      payload: { success: false, error: { type: "NOT_AUTHENTICATED" } },
    };
    port.postMessage(ack);
    return;
  }

  try {
    const response = await fetch(
      `${OKO_API_ENDPOINT}/user_dashboard/v1/get_connected_apps`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (!response.ok) {
      const ack: OkoWalletMsgGetConnectedAppsAck = {
        target: OKO_SDK_TARGET,
        msg_type: "__get_connected_apps_ack__",
        payload: {
          success: false,
          error: {
            type: "FETCH_ERROR",
            error: `HTTP ${response.status}`,
          },
        },
      };
      port.postMessage(ack);
      return;
    }

    const data = await response.json();

    const ack: OkoWalletMsgGetConnectedAppsAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__get_connected_apps_ack__",
      payload: data,
    };
    port.postMessage(ack);
  } catch (error) {
    const ack: OkoWalletMsgGetConnectedAppsAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__get_connected_apps_ack__",
      payload: {
        success: false,
        error: { type: "FETCH_ERROR", error: String(error) },
      },
    };
    port.postMessage(ack);
  }
}
