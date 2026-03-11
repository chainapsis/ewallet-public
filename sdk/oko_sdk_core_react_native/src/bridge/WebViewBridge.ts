import type { RefObject } from "react";
import type WebView from "react-native-webview";
import type { OkoWalletMsg } from "@oko-wallet/oko-sdk-core";
import type { BridgeRequest, BridgeResponse, PendingRequest } from "./types";

const REQUEST_TIMEOUT_MS = 30_000;

let _counter = 0;
function generateId(): string {
  return `rn_${Date.now()}_${++_counter}`;
}

export type BridgeEventHandler = (eventType: string, payload: unknown) => void;

export class WebViewBridge {
  private webViewRef: RefObject<WebView | null>;
  private pending: Map<string, PendingRequest> = new Map();
  private ready = false;

  onEvent: BridgeEventHandler | null = null;

  constructor(webViewRef: RefObject<WebView | null>) {
    this.webViewRef = webViewRef;
  }

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  isReady(): boolean {
    return this.ready;
  }

  sendMessage(msg: OkoWalletMsg): Promise<OkoWalletMsg> {
    const id = generateId();

    return new Promise<OkoWalletMsg>((resolve, reject) => {
      if (!this.webViewRef.current) {
        reject(new Error("[oko-rn] WebView ref is not available"));
        return;
      }

      if (!this.ready) {
        reject(new Error("[oko-rn] WebView bridge is not ready"));
        return;
      }

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `[oko-rn] bridge response timeout (${REQUEST_TIMEOUT_MS}ms), msg_type: ${msg.msg_type}`,
          ),
        );
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });

      const request: BridgeRequest = { id, msg };
      this.webViewRef.current.postMessage(JSON.stringify(request));
    });
  }

  handleMessage(rawData: string): void {
    let parsed: BridgeResponse;
    try {
      parsed = JSON.parse(rawData) as BridgeResponse;
    } catch {
      console.warn("[oko-rn] failed to parse bridge message:", rawData);
      return;
    }

    if (parsed.type === "ack") {
      const pending = this.pending.get(parsed.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(parsed.id);
        pending.resolve(parsed.payload);
      }
      return;
    }

    if (parsed.type === "event") {
      this.onEvent?.(parsed.eventType, parsed.payload);
      return;
    }
  }

  dispose(): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("[oko-rn] bridge disposed"));
    }
    this.pending.clear();
    this.onEvent = null;
  }
}
