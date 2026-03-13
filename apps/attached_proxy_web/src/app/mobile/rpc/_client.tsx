"use client";

import { useRef, useState } from "react";

import { ATTACHED_ORIGIN } from "../_shared/build_iframe_src";
import {
  buildRpcCallbackUrl,
  decodeRpcPayload,
  parseRpcRequestFromLocation,
} from "../_shared/rpc_codec";
import { sendToAttached } from "../_shared/send_to_attached";
import {
  useAttachedInit,
  type AttachedInitPayload,
} from "../_shared/use_attached_init";

/** Methods that show the iframe (user-facing UI). */
const VISIBLE_METHODS = new Set([
  "open_modal",
  "__export_private_key__",
]);

export function RpcClient({
  iframeSrc,
  method,
  redirectScheme,
  expectedPublicKey,
}: {
  iframeSrc: string;
  method: string;
  redirectScheme: string;
  expectedPublicKey: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Preparing...");
  const [showIframe, setShowIframe] = useState(false);

  useAttachedInit((initPayload) => {
    void executeRpc(initPayload);
  });

  async function executeRpc(initPayload: AttachedInitPayload | null) {
    try {
      if (!method) {
        throw new Error("Missing method in URL");
      }

      setStatus("Loading wallet...");

      // Clean up stale session if the iframe's stored user doesn't match
      if (expectedPublicKey !== null) {
        const iframePk = initPayload?.data?.public_key ?? null;
        if (iframePk !== null && iframePk !== expectedPublicKey) {
          console.info("[oko-mobile-rpc] stale session detected, clearing", {
            expected: expectedPublicKey,
            found: iframePk,
          });
          await sendToAttached(iframeRef.current!, {
            target: "oko_attached",
            msg_type: "sign_out",
            payload: null,
          });
        }
      }

      // Parse payload from URL
      const { encodedPayload } = parseRpcRequestFromLocation();
      const payload = encodedPayload
        ? decodeRpcPayload<unknown>(encodedPayload)
        : null;

      // Patch origin for methods that use it.
      // Must use this page's origin (the host that loaded the iframe),
      // not ATTACHED_ORIGIN, because the wallet is stored under host_origin.
      if (payload && typeof payload === "object" && "data" in payload) {
        const data = (payload as { data?: { payload?: { origin?: string } } })
          .data;
        if (data?.payload && "origin" in data.payload) {
          data.payload.origin = window.location.origin;
        }
      }

      // Show iframe for user-facing methods
      const isVisible = VISIBLE_METHODS.has(method);
      if (isVisible) {
        setShowIframe(true);
      }

      // Forward to attached iframe
      const ack = await sendToAttached<{ payload: unknown }>(
        iframeRef.current!,
        {
          target: "oko_attached",
          msg_type: method,
          payload,
        },
      );

      setShowIframe(false);
      returnToApp(ack.payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setShowIframe(false);
      setStatus(`Error: ${message}`);
      console.error("[oko-mobile-rpc] error:", err);

      returnToApp({
        success: false,
        err: { type: "rpc_error", message },
      });
    }
  }

  function returnToApp(result: unknown) {
    if (!redirectScheme) {
      return;
    }

    const { url, stats } = buildRpcCallbackUrl(redirectScheme, result);
    console.info("[oko-mobile-rpc] result", {
      method,
      jsonBytes: stats.jsonBytes,
      compressedBytes: stats.compressedBytes,
      encodedChars: stats.encodedChars,
      callbackUrlChars: url.length,
    });
    window.location.replace(url);
  }

  return (
    <>
      {!showIframe && (
        <div
          style={{
            textAlign: "center",
            fontSize: 16,
            padding: 20,
          }}
        >
          {status}
        </div>
      )}
      <iframe
        id="oko-attached"
        title="Oko Wallet"
        ref={iframeRef}
        src={iframeSrc}
        style={
          showIframe
            ? { flex: 1, width: "100%", border: "none" }
            : { display: "none" }
        }
      />
    </>
  );
}
