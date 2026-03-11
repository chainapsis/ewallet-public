import type { OkoWalletMsg } from "@oko-wallet/oko-sdk-core";

/** RN SDK → WebView bridge page 로 보내는 메시지 */
export interface BridgeRequest {
  id: string;
  msg: OkoWalletMsg;
}

/** WebView bridge page → RN SDK 로 돌아오는 응답 */
export interface BridgeAckResponse {
  id: string;
  type: "ack";
  payload: OkoWalletMsg;
}

/** WebView bridge page → RN SDK 로 오는 이벤트 (init, oauth_sign_in_update 등) */
export interface BridgeEventResponse {
  type: "event";
  eventType: string;
  payload: unknown;
}

export type BridgeResponse = BridgeAckResponse | BridgeEventResponse;

export interface PendingRequest {
  resolve: (value: OkoWalletMsg) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
