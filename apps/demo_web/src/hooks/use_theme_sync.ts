import { useEffect } from "react";

import { useSDKState } from "@oko-wallet-demo-web/state/sdk";
import { useThemeState } from "@oko-wallet-demo-web/state/theme";

export const useThemeSync = () => {
  const { initialize, setTheme } = useThemeState();
  const theme = useThemeState((s) => s.theme);
  const preference = useThemeState((s) => s.preference);
  const okoCosmos = useSDKState((s) => s.oko_cosmos);
  const isIframeReady = useSDKState((s) => s.isCosmosLazyInitialized);

  useEffect(() => {
    if (useThemeState.persist.hasHydrated()) {
      initialize();
      return;
    }
    return useThemeState.persist.onFinishHydration(() => {
      initialize();
    });
  }, [initialize]);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [preference, setTheme]);

  useEffect(() => {
    if (!isIframeReady || !okoCosmos) {
      return;
    }

    okoCosmos.okoWallet.setTheme(theme);
  }, [theme, isIframeReady, okoCosmos]);
};
