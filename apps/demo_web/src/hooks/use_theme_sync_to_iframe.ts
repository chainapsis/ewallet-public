import { useEffect } from "react";

import { useThemeState } from "@oko-wallet-demo-web/state/theme";

const OKO_IFRAME_ID = "oko-attached";

/**
 * Sends the current resolved theme to the attached iframe via postMessage
 * whenever it changes. This keeps the Sign Modal's theme in sync with
 * the Demo web's theme toggle.
 *
 * Also sends on iframe load to cover the initial page load case
 * (new tab with persisted theme that differs from the backend default).
 */
export const useThemeSyncToIframe = () => {
  const theme = useThemeState((s) => s.theme);

  useEffect(() => {
    const iframe = document.getElementById(
      OKO_IFRAME_ID,
    ) as HTMLIFrameElement | null;

    if (!iframe) {
      return;
    }

    const sendTheme = () => {
      iframe.contentWindow?.postMessage(
        {
          target: "oko_attached",
          msg_type: "set_theme",
          payload: { theme },
        },
        "*",
      );
    };

    // Send immediately for runtime theme changes (iframe already loaded)
    if (iframe.contentWindow) {
      sendTheme();
    }

    // Also send on iframe load for initial page load timing
    iframe.addEventListener("load", sendTheme);
    return () => iframe.removeEventListener("load", sendTheme);
  }, [theme]);
};
