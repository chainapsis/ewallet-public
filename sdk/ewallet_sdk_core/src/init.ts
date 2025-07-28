import type { KeplrEwalletInitArgs, Result } from "./types";
import { registerMsgListener } from "./window_msg/listener";
import { KeplrEWallet } from "./keplr_ewallet";

const EWALLET_ATTACHED_ENDPOINT_LOCAL = `http://localhost:3201`;

const KEPLR_EWALLET_ELEM_ID = "keplr-ewallet";

export async function initKeplrEwalletCore(
  args: KeplrEwalletInitArgs,
): Promise<Result<KeplrEWallet, string>> {
  console.info("init keplr ewallet, args: %j", args);

  if (window === undefined) {
    // TODO: @elden
    return {
      success: false,
      err: "Keplr eWallet can only be initialized in the browser",
    };
  }

  if (window.__keplr_ewallet) {
    const el = document.getElementById(KEPLR_EWALLET_ELEM_ID); // CHECK: replace with appId
    if (el !== null) {
      return {
        success: false,
        err: "Some problem occurred during Keplr eWallet initialization",
      };
    }

    console.info("Keplr ewallet is already initialized");
    return { success: true, data: window.__keplr_ewallet };
  }

  const registering = registerMsgListener();

  const iframeRes = setupIframeElement();
  if (!iframeRes.success) {
    return iframeRes;
  }

  const iframe = iframeRes.data;

  // Wait till the "init" message is sent from the being-loaded iframe document.
  await registering;

  const ewalletCore = new KeplrEWallet(
    args.customerId,
    iframe,
    EWALLET_ATTACHED_ENDPOINT_LOCAL,
  );

  window.__keplr_ewallet = ewalletCore;

  return { success: true, data: ewalletCore };
}

function setupIframeElement(): Result<HTMLIFrameElement, string> {
  const bodyEls = document.getElementsByTagName("body");
  if (bodyEls[0] === undefined) {
    console.error("body element not found");
    return {
      success: false,
      err: "body element not found",
    };
  }

  const bodyEl = bodyEls[0];

  // iframe setup
  const iframe = document.createElement("iframe");
  iframe.src = EWALLET_ATTACHED_ENDPOINT_LOCAL;

  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "100vw";
  iframe.style.height = "100vh";
  iframe.style.border = "none";
  iframe.style.display = "none";
  iframe.style.backgroundColor = "transparent";
  iframe.style.overflow = "hidden";

  bodyEl.appendChild(iframe);

  return { success: true, data: iframe };
}
