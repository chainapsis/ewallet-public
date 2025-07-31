import type {
  KeplrEwalletInitArgs,
  Result,
} from "@keplr-ewallet-sdk-core/types";
import { registerMsgListener } from "@keplr-ewallet-sdk-core/window_msg/listener";
import { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";

const SDK_ENDPOINT = `https://attached.embed.keplr.app`;
const KEPLR_EWALLET_ELEM_ID = "keplr-ewallet";

export async function initKeplrEwalletCore(
  args: KeplrEwalletInitArgs,
): Promise<Result<KeplrEWallet, string>> {
  console.info("Init Keplr Ewallet core");

  if (window === undefined) {
    return {
      success: false,
      err: "Keplr eWallet can only be initialized in the browser",
    };
  }

  if (window.__keplr_ewallet) {
    const el = document.getElementById(KEPLR_EWALLET_ELEM_ID);
    if (el !== null) {
      return {
        success: false,
        err: "Some problem occurred during Keplr eWallet initialization",
      };
    }

    console.info("Keplr Ewallet is already initialized");
    return { success: true, data: window.__keplr_ewallet };
  }

  const checkURLRes = await checkURL(args.sdk_endpoint);
  if (!checkURLRes.success) {
    return checkURLRes;
  }

  const url = checkURLRes.data;

  const registering = registerMsgListener();

  const iframeRes = setupIframeElement(url);
  if (!iframeRes.success) {
    return iframeRes;
  }

  const iframe = iframeRes.data;

  // Wait till the "init" message is sent from the being-loaded iframe document.
  await registering;

  const ewalletCore = new KeplrEWallet(args.customerId, iframe, url);

  window.__keplr_ewallet = ewalletCore;

  return { success: true, data: ewalletCore };
}

function setupIframeElement(url: string): Result<HTMLIFrameElement, string> {
  const bodyEls = document.getElementsByTagName("body");
  if (bodyEls[0] === undefined) {
    console.error("body element not found");
    return {
      success: false,
      err: "body element not found",
    };
  }

  const bodyEl = bodyEls[0];

  console.log("Keplr EWallet SDK URL: %s", url);

  // iframe setup
  const iframe = document.createElement("iframe");
  iframe.src = url;

  // iframe style
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "100vw";
  iframe.style.height = "100vh";
  iframe.style.border = "none";
  iframe.style.display = "none";
  iframe.style.backgroundColor = "transparent";
  iframe.style.overflow = "hidden";
  iframe.style.zIndex = "1000000";

  // attach
  bodyEl.appendChild(iframe);

  return { success: true, data: iframe };
}

async function checkURL(url?: string): Promise<Result<string, string>> {
  try {
    const _url = url ?? SDK_ENDPOINT;

    const response = await fetch(_url, { mode: "no-cors" });
    if (!response.ok) {
      return { success: true, data: _url };
    } else {
      return {
        success: false,
        err: `SDK endpoint, resp contains err, url: ${_url}`,
      };
    }
  } catch (err: any) {
    return { success: false, err: err.toString() };
  }
}
