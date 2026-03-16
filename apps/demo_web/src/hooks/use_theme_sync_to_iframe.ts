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
    const sendTheme = (target: HTMLIFrameElement) => {
      target.contentWindow?.postMessage(
        {
          target: "oko_attached",
          msg_type: "set_theme",
          payload: { theme },
        },
        "*",
      );
    };

    const attach = (iframe: HTMLIFrameElement) => {
      if (iframe.contentWindow) {
        sendTheme(iframe);
      }
      const onLoad = () => sendTheme(iframe);
      iframe.addEventListener("load", onLoad);
      return () => iframe.removeEventListener("load", onLoad);
    };

    const iframe = document.getElementById(
      OKO_IFRAME_ID,
    ) as HTMLIFrameElement | null;

    if (iframe) {
      return attach(iframe);
    }

    // iframe not yet in DOM — watch for SDK to create it
    const observer = new MutationObserver(() => {
      const el = document.getElementById(
        OKO_IFRAME_ID,
      ) as HTMLIFrameElement | null;
      if (el) {
        observer.disconnect();
        attach(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [theme]);
};
