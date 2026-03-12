"use client";

import { useEffect, useRef } from "react";

import { ATTACHED_ORIGIN } from "./build_iframe_src";

/**
 * Listens for the `init` message from the attached iframe, replies with
 * `init_ack`, and invokes the callback with the init payload.
 *
 * Uses a ref for the callback so callers don't need `useCallback`.
 */
export function useAttachedInit(
  onInit: (payload: { success: boolean; err?: string } | null) => void,
) {
  const callbackRef = useRef(onInit);
  callbackRef.current = onInit;

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== ATTACHED_ORIGIN) {
        return;
      }
      const msg = event.data;
      if (!msg || typeof msg !== "object") {
        return;
      }

      if (msg.msg_type === "init") {
        event.ports?.[0]?.postMessage({
          target: "oko_attached",
          msg_type: "init_ack",
          payload: { success: true, data: null },
        });
        callbackRef.current(msg.payload ?? null);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
}
