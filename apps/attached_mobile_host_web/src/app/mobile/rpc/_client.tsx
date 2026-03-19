import { type RefObject, useState } from "react";

import {
  buildRpcCallbackUrl,
  decodeRpcPayload,
  parseRpcRequestFromLocation,
} from "../_shared/rpc_codec";
import { sendToAttached } from "../_shared/send_to_attached";
import { StatusScreen } from "../_shared/status_screen";
import {
  type AttachedInitPayload,
  useAttachedInit,
} from "../_shared/use_attached_init";

/** Methods that show the iframe (user-facing UI). */
const VISIBLE_METHODS = new Set(["open_modal", "__export_private_key__"]);

export function RpcClient({
  iframeRef,
  method,
  redirectScheme,
  expectedPublicKey,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  method: string;
  redirectScheme: string;
  expectedPublicKey: string | null;
}) {
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

      // Parse payload from URL hash
      const { encodedPayload } = parseRpcRequestFromLocation();
      const payload = encodedPayload
        ? decodeRpcPayload<unknown>(encodedPayload)
        : null;

      // Show iframe for user-facing methods
      const isVisible = VISIBLE_METHODS.has(method);
      if (isVisible) {
        setShowIframe(true);
        if (iframeRef.current) {
          iframeRef.current.style.display = "";
        }
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

      hideIframe();
      returnToApp(ack.payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      hideIframe();
      setStatus(`Error: ${message}`);
      console.error("[oko-mobile-rpc] error:", err);

      returnToApp({
        success: false,
        err: { type: "rpc_error", message },
      });
    }
  }

  function hideIframe() {
    setShowIframe(false);
    if (iframeRef.current) {
      iframeRef.current.style.display = "none";
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
        <StatusScreen
          title={status}
          tone={status.startsWith("Error:") ? "error" : "default"}
        />
      )}
    </>
  );
}
