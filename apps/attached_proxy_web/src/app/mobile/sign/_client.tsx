"use client";

import { useRef, useState } from "react";

import { sendToAttached } from "../_shared/send_to_attached";
import { useAttachedInit } from "../_shared/use_attached_init";

export function SignClient({
  iframeSrc,
  relayCode,
  redirectScheme,
}: {
  iframeSrc: string;
  relayCode: string;
  redirectScheme: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Preparing...");
  const [showIframe, setShowIframe] = useState(false);

  useAttachedInit(() => {
    startSigningFlow();
  });

  async function startSigningFlow() {
    if (!relayCode) {
      setStatus("Error: missing relay code.");
      console.error("[oko-mobile-sign] missing relay_code");
      return;
    }

    try {
      setStatus("Loading wallet...");

      const consumeRes = await fetch("/api/mobile/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consume", code: relayCode }),
      });
      const consumeData = await consumeRes.json();

      if (!consumeData.success || !consumeData.payload) {
        throw new Error("Invalid or expired signing request");
      }

      const signingRequest = consumeData.payload;

      // Patch origin: SDK sets origin to the app's redirect scheme,
      // but appState stores apiKey/keyShares under the proxy origin.
      if (signingRequest.data?.payload) {
        signingRequest.data.payload.origin = window.location.origin;
      }

      // Show iframe with signing modal
      setShowIframe(true);

      const modalResult = await sendToAttached(iframeRef.current!, {
        target: "oko_attached",
        msg_type: "open_modal",
        payload: signingRequest,
      });

      // Store result in relay so SDK can poll for it
      setShowIframe(false);
      await storeResult(modalResult.payload);
      returnToApp();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setShowIframe(false);
      setStatus(`Error: ${message}`);
      console.error("[oko-mobile-sign] error:", err);

      try {
        await storeResult({
          type: "error",
          error: { type: "os_browser_error", message },
        });
        returnToApp();
      } catch (e) {
        console.error("[oko-mobile-sign] failed to store error result:", e);
      }
    }
  }

  async function storeResult(payload: unknown) {
    const res = await fetch("/api/mobile/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "store", payload, key: `result:${relayCode}` }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error("Failed to store signing result");
    }
  }

  function returnToApp() {
    if (redirectScheme) {
      window.location.href = `${redirectScheme}://`;
    }
  }

  return (
    <>
      {!showIframe && (
        <div
          style={{
            textAlign: "center",
            color: "#666",
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
