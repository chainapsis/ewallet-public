"use client";

import type {
  MakeSigModalPayload,
  MakeSigModalErrorAckPayload,
  OpenModalAckPayload,
  OkoWalletMsgOpenModalAck,
} from "@oko-wallet/oko-sdk-core";
import { useRef, useState } from "react";

import {
  decodeSignRequestPayload,
  encodeSignResultPayloadWithStats,
  getEncodedSignRequestFromLocation,
  SIGN_URL_CODEC_VERSION,
  SIGN_URL_RESULT_PARAM,
  SIGN_URL_VERSION_PARAM,
} from "../_shared/sign_url_codec";
import { sendToAttached } from "../_shared/send_to_attached";
import { useAttachedInit } from "../_shared/use_attached_init";

function isMakeSigModalPayload(
  payload: unknown,
): payload is MakeSigModalPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as {
    modal_type?: unknown;
    modal_id?: unknown;
    data?: unknown;
  };
  return (
    typeof candidate.modal_id === "string" &&
    typeof candidate.data === "object" &&
    (candidate.modal_type === "eth/make_signature" ||
      candidate.modal_type === "cosmos/make_signature" ||
      candidate.modal_type === "svm/make_signature")
  );
}

export function SignClient({
  iframeSrc,
  redirectScheme,
}: {
  iframeSrc: string;
  redirectScheme: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Preparing...");
  const [showIframe, setShowIframe] = useState(false);

  useAttachedInit(() => {
    void startSigningFlow();
  });

  async function startSigningFlow() {
    let signingRequest: MakeSigModalPayload | null = null;

    try {
      setStatus("Loading wallet...");

      const encodedRequest = getEncodedSignRequestFromLocation();
      if (!encodedRequest) {
        throw new Error("Missing signing request in URL");
      }

      const decodedRequest = decodeSignRequestPayload(encodedRequest);
      if (!isMakeSigModalPayload(decodedRequest)) {
        throw new Error("Invalid signing request payload");
      }
      signingRequest = decodedRequest;
      console.info("[oko-mobile-sign-size] request_received", {
        modalType: signingRequest.modal_type,
        modalId: signingRequest.modal_id,
        encodedChars: encodedRequest.length,
        hashChars: window.location.hash.length,
        hrefChars: window.location.href.length,
      });

      // Patch origin: SDK sets origin to the app's redirect scheme,
      // but appState stores apiKey/keyShares under the proxy origin.
      if (signingRequest.data?.payload) {
        signingRequest.data.payload.origin = window.location.origin;
      }

      // Show iframe with signing modal
      setShowIframe(true);

      const modalResult = await sendToAttached<OkoWalletMsgOpenModalAck>(
        iframeRef.current!,
        {
          target: "oko_attached",
          msg_type: "open_modal",
          payload: signingRequest,
        },
      );

      setShowIframe(false);
      returnToApp(modalResult.payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setShowIframe(false);
      setStatus(`Error: ${message}`);
      console.error("[oko-mobile-sign] error:", err);

      if (signingRequest) {
        returnToApp(buildErrorAck(signingRequest, message));
      } else if (redirectScheme) {
        window.location.replace(`${redirectScheme}://`);
      }
    }
  }

  function buildErrorAck(
    signingRequest: MakeSigModalPayload,
    message: string,
  ): MakeSigModalErrorAckPayload {
    return {
      modal_type: signingRequest.modal_type,
      modal_id: signingRequest.modal_id,
      type: "error",
      error: {
        type: "unknown_error",
        error: message,
      },
    };
  }

  function returnToApp(payload: OpenModalAckPayload) {
    if (!redirectScheme) {
      return;
    }

    const query = new URLSearchParams();
    query.set(SIGN_URL_VERSION_PARAM, SIGN_URL_CODEC_VERSION);
    const { encoded, stats } = encodeSignResultPayloadWithStats(payload);
    query.set(SIGN_URL_RESULT_PARAM, encoded);
    const callbackUrl = `${redirectScheme}://?${query.toString()}`;
    console.info("[oko-mobile-sign-size] result", {
      modalType: payload.modal_type,
      modalId: payload.modal_id,
      ackType: payload.type,
      jsonBytes: stats.jsonBytes,
      compressedBytes: stats.compressedBytes,
      encodedChars: stats.encodedChars,
      callbackUrlChars: callbackUrl.length,
    });
    window.location.replace(callbackUrl);
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
