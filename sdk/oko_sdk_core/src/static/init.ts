import { UTM_CAMPAIGN, UTM_SOURCE } from "@oko-wallet/oko-types/referral";
import type { Result } from "@oko-wallet/stdlib-js";

import { OkoWallet } from "@oko-wallet-sdk-core/constructor";
import type { OkoWalletInitError } from "@oko-wallet-sdk-core/errors";
import { setUpIframeElement } from "@oko-wallet-sdk-core/iframe";
import type {
  OkoWalletInitArgs,
  OkoWalletWebInterface,
} from "@oko-wallet-sdk-core/types";

const SDK_ENDPOINT = `https://attached.oko.app`;

export function init(
  args: OkoWalletInitArgs,
): Result<OkoWalletWebInterface, OkoWalletInitError> {
  try {
    console.log("[oko] init");

    if (window === undefined) {
      console.error("[oko] oko wallet can only be initialized in the browser");

      return {
        success: false,
        err: { type: "not_in_browser" },
      };
    }

    if (window.__oko_locked === true) {
      console.warn(
        "oko wallet init is locked. Is init being executed concurrently?",
      );
      return { success: false, err: { type: "is_locked" } };
    } else {
      window.__oko_locked = true;
    }

    console.log("[oko] sdk endpoint: %s", args.sdk_endpoint);

    if (window.__oko) {
      console.warn("[oko] already initialized");

      if (args.theme) {
        window.__oko.setTheme(args.theme);
      }

      return { success: true, data: window.__oko };
    }

    const hostOrigin = new URL(window.location.toString()).origin;
    if (hostOrigin.length === 0) {
      return {
        success: false,
        err: { type: "host_origin_empty" },
      };
    }

    const sdkEndpoint = args.sdk_endpoint ?? SDK_ENDPOINT;

    // Check if endpoint is valid url format
    let sdkEndpointURL: URL;
    try {
      sdkEndpointURL = new URL(sdkEndpoint);
      sdkEndpointURL.searchParams.append("host_origin", hostOrigin);

      // Forward UTM parameters to attached iframe for referral tracking
      const currentUrl = new URL(window.location.toString());
      const utmSource = currentUrl.searchParams.get(UTM_SOURCE);
      const utmCampaign = currentUrl.searchParams.get(UTM_CAMPAIGN);

      if (utmSource) {
        sdkEndpointURL.searchParams.append(UTM_SOURCE, utmSource);
      }
      if (utmCampaign) {
        sdkEndpointURL.searchParams.append(UTM_CAMPAIGN, utmCampaign);
      }

      sdkEndpointURL.searchParams.append("sdk_version", OkoWallet.version);

      if (args.theme) {
        sdkEndpointURL.searchParams.append("theme", args.theme);
      }
    } catch (_err) {
      return {
        success: false,
        err: { type: "sdk_endpoint_invalid_url" },
      };
    }

    console.log("[oko] resolved sdk endpoint: %s", sdkEndpoint);
    console.log("[oko] host origin: %s", hostOrigin);

    const iframeRes = setUpIframeElement(sdkEndpointURL);
    if (!iframeRes.success) {
      return {
        success: false,
        err: { type: "iframe_setup_fail", msg: iframeRes.err.toString() },
      };
    }

    const iframe = iframeRes.data;

    const okoWallet = new OkoWallet(args.api_key, iframe, sdkEndpoint);
    okoWallet._theme = args.theme ?? null;

    if (window.__oko) {
      console.warn("[oko] oko wallet has been initialized by another process");

      return { success: true, data: window.__oko };
    } else {
      window.__oko = okoWallet;
      return { success: true, data: okoWallet };
    }
  } catch (err: any) {
    console.error("[oko] init fail", err);

    throw new Error("[oko] sdk init fail, unreachable");
  } finally {
    if (window.__oko_locked === true) {
      window.__oko_locked = false;
    }
  }
}
