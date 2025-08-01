import type { KeplrEwalletInitArgs } from "@keplr-ewallet-sdk-core/types";
import { registerMsgListener } from "@keplr-ewallet-sdk-core/window_msg/listener";
import { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
import { type Result } from "@keplr-ewallet/stdlib-js";
import { setupIframeElement } from "./iframe";

const SDK_ENDPOINT = `https://attached.embed.keplr.app`;
const KEPLR_EWALLET_ELEM_ID = "keplr-ewallet";

export async function initKeplrEwalletCore(
  args: KeplrEwalletInitArgs,
): Promise<Result<KeplrEWallet, string>> {
  console.info("[keplr] init");
  console.info("[keplr] sdk endpoint: %s", args.sdk_endpoint);

  if (window === undefined) {
    console.error("[keplr] EWallet can only be initialized in the browser");

    return {
      success: false,
      err: "Not in the browser context",
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

    console.info("[keplr] already initialized");
    return { success: true, data: window.__keplr_ewallet };
  }

  const checkURLRes = await checkURL(args.sdk_endpoint);
  if (!checkURLRes.success) {
    return checkURLRes;
  }

  const registering = registerMsgListener();

  const url = checkURLRes.data;
  console.log("[keplr] resolved SDK URL: %s", url);

  const iframeRes = setupIframeElement(url);
  if (!iframeRes.success) {
    return iframeRes;
  }

  const iframe = iframeRes.data;

  // Wait till the "init" message is sent from the being-loaded iframe document.
  await registering;

  const ewalletCore = new KeplrEWallet(args.customer_id, iframe, url);

  window.__keplr_ewallet = ewalletCore;

  return { success: true, data: ewalletCore };
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
