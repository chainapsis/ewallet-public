"use client";

import { useEffect, useRef } from "react";

import { useAttachedInit } from "../_shared/use_attached_init";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(data: string): void };
  }
}

export function BridgeClient({ iframeSrc }: { iframeSrc: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle init from attached iframe → forward to native SDK
  useAttachedInit((payload) => {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "event", eventType: "init", payload }),
    );
  });

  // Relay messages from native SDK → attached iframe
  useEffect(() => {
    const origin = window.location.origin;

    function handleNativeMessage(data: string) {
      let parsed: { id: string; msg: unknown };
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }
      if (!parsed?.id || !parsed?.msg) {
        return;
      }

      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) {
        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            id: parsed.id,
            type: "ack",
            payload: {
              target: "oko_sdk",
              msg_type: "unknown_msg_type",
              payload: "iframe not available",
            },
          }),
        );
        return;
      }

      const channel = new MessageChannel();
      channel.port1.onmessage = (ackEvent) => {
        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            id: parsed.id,
            type: "ack",
            payload: ackEvent.data,
          }),
        );
      };
      iframe.contentWindow.postMessage(parsed.msg, origin, [channel.port2]);
    }

    function onWindowMessage(event: MessageEvent) {
      if (event.origin === window.location.origin) {
        return;
      }
      if (typeof event.data === "string") {
        handleNativeMessage(event.data);
      }
    }

    // Android WebView posts on document, iOS on window
    function onDocumentMessage(event: Event) {
      const msgEvent = event as MessageEvent;
      if (typeof msgEvent.data === "string") {
        handleNativeMessage(msgEvent.data);
      }
    }

    window.addEventListener("message", onWindowMessage);
    document.addEventListener("message", onDocumentMessage);
    return () => {
      window.removeEventListener("message", onWindowMessage);
      document.removeEventListener("message", onDocumentMessage);
    };
  }, []);

  return (
    <iframe
      id="oko-attached"
      title="Oko Wallet"
      ref={iframeRef}
      src={iframeSrc}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  );
}
