"use client";

import type { OkoWalletMsgSignOutAck } from "@oko-wallet/oko-sdk-core";
import { useRef, useState } from "react";

import { sendToAttached } from "../_shared/send_to_attached";
import { useAttachedInit } from "../_shared/use_attached_init";

export function SignOutClient({
  iframeSrc,
  redirectScheme,
}: {
  iframeSrc: string;
  redirectScheme: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Signing out...");

  useAttachedInit((payload) => {
    if (payload && !payload.success) {
      console.error("[oko-mobile-sign-out] attached init failed:", payload);
      returnToApp();
      return;
    }

    void startSignOut();
  });

  async function startSignOut() {
    try {
      setStatus("Clearing session...");
      const ack = await sendToAttached<OkoWalletMsgSignOutAck>(
        iframeRef.current!,
        {
          target: "oko_attached",
          msg_type: "sign_out",
          payload: null,
        },
        10_000,
      );

      if (ack.msg_type !== "sign_out_ack" || !ack.payload?.success) {
        console.error("[oko-mobile-sign-out] sign_out failed:", ack);
      }
    } catch (error) {
      console.error("[oko-mobile-sign-out] sign_out error:", error);
    }

    returnToApp();
  }

  function returnToApp() {
    if (!redirectScheme) {
      return;
    }

    window.location.replace(`${redirectScheme}://`);
  }

  return (
    <>
      <div
        style={{
          textAlign: "center",
          fontSize: 16,
          padding: 20,
        }}
      >
        {status}
      </div>
      <iframe
        id="oko-attached"
        title="Oko Wallet"
        ref={iframeRef}
        src={iframeSrc}
        style={{ display: "none" }}
      />
    </>
  );
}
