import type { MsgEventContext } from "./types";
import { OKO_SDK_TARGET } from "./target";
import { useAppState } from "@oko-wallet-attached/store/app";
import {
  OKO_API_ENDPOINT,
  USER_DASHBOARD_ORIGINS,
} from "@oko-wallet-attached/requests/endpoints";

// NOTE: Since this method can only be used within user_dashboard,
// it is not exposed to the SDK, and its type is also defined within that file.

interface ConnectedApp {
  customer_id: string;
  label: string | null;
  logo_url: string | null;
  url: string | null;
  connected_at: string;
  state: string;
}
type GetConnectedAppsError =
  | { type: "UNAUTHORIZED_ORIGIN" }
  | { type: "NOT_AUTHENTICATED" }
  | { type: "FETCH_ERROR"; error: string };
interface GetConnectedAppsAckSuccessPayload {
  success: true;
  data: ConnectedApp[];
}
interface GetConnectedAppsAckErrorPayload {
  success: false;
  error: GetConnectedAppsError;
}
type GetConnectedAppsAckPayload = GetConnectedAppsAckSuccessPayload | GetConnectedAppsAckErrorPayload;

interface OkoWalletMsgGetConnectedAppsAck {
  target: "oko_sdk";
  msg_type: "__get_connected_apps_ack__";
  payload: GetConnectedAppsAckPayload;
}

export async function handleGetConnectedApps(
  ctx: MsgEventContext,
): Promise<void> {
  const { port, hostOrigin } = ctx;

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

  const authToken = useAppState.getState().getAuthToken(hostOrigin);
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
