export type OkoWalletMsgGetConnectedApps = {
  target: "oko_attached";
  msg_type: "__get_connected_apps__";
  payload: null;
};

export interface ConnectedApp {
  customer_id: string;
  label: string | null;
  logo_url: string | null;
  url: string | null;
  connected_at: string;
  state: string;
}

export type GetConnectedAppsError =
  | { type: "UNAUTHORIZED_ORIGIN" }
  | { type: "NOT_AUTHENTICATED" }
  | { type: "FETCH_ERROR"; error: string };

export interface GetConnectedAppsAckSuccessPayload {
  success: true;
  data: ConnectedApp[];
}

export interface GetConnectedAppsAckErrorPayload {
  success: false;
  error: GetConnectedAppsError;
}

export type GetConnectedAppsAckPayload =
  | GetConnectedAppsAckSuccessPayload
  | GetConnectedAppsAckErrorPayload;

export interface OkoWalletMsgGetConnectedAppsAck {
  target: "oko_sdk";
  msg_type: "__get_connected_apps_ack__";
  payload: GetConnectedAppsAckPayload;
}
