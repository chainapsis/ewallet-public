import { useEffect } from "react";

import { useSDKState } from "@oko-wallet-demo-web/state/sdk";
import { useThemeState } from "@oko-wallet-demo-web/state/theme";

const OKO_IFRAME_ID = "oko-attached";

/**
 * Sends the current resolved theme to the attached iframe via postMessage.
 *
 * Waits until the SDK is fully initialized (iframe init ack received)
 * before sending, which guarantees the iframe's message handler is
 * registered. Re-sends whenever the theme changes (user toggle).
 */
export const useThemeSyncToIframe = () => {
  const theme = useThemeState((s) => s.theme);
  const isIframeReady = useSDKState((s) => s.isCosmosLazyInitialized);

  useEffect(() => {
    if (!isIframeReady) {
      return;
    }

    const iframe = document.getElementById(
      OKO_IFRAME_ID,
    ) as HTMLIFrameElement | null;

    if (!iframe?.contentWindow) {
      return;
    }

    iframe.contentWindow.postMessage(
      {
        target: "oko_attached",
        msg_type: "set_theme",
        payload: { theme },
      },
      "*",
    );
  }, [theme, isIframeReady]);
};
