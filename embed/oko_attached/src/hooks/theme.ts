import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import type { OkoWalletTheme } from "@oko-wallet/oko-sdk-core";
import { RedirectUriSearchParamsKey } from "@oko-wallet/oko-sdk-core";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { useLayoutEffect, useState } from "react";

import {
  determineTheme,
  setColorScheme,
} from "@oko-wallet-attached/components/attached_initialized/color_scheme";
import { getSystemTheme } from "@oko-wallet-attached/components/google_callback/theme";
import { getOAuthStateFromUrl } from "@oko-wallet-attached/components/google_callback/use_callback";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

export function useSetThemeInCallback(providerType: AuthType) {
  const { setTheme } = useAppState();
  const initialTheme = getSystemTheme();
  const [_theme, _setTheme] = useState<Theme>(initialTheme);

  useLayoutEffect(() => {
    // Apply system theme immediately to prevent white flash on dark-mode devices.
    setColorScheme(initialTheme);

    function fn() {
      let hostOrigin: string | null = null;
      let sdkThemeOverride: OkoWalletTheme | null = null;

      if (providerType === "google") {
        const oauthState = getOAuthStateFromUrl();
        hostOrigin = oauthState.targetOrigin;
        if (oauthState.theme === "light" || oauthState.theme === "dark") {
          sdkThemeOverride = oauthState.theme;
        }
      }

      if (providerType === "auth0" || providerType === "telegram") {
        const searchParams = new URLSearchParams(window.location.search);
        const hostOriginFromQuery = searchParams.get("host_origin");
        if (hostOriginFromQuery) {
          hostOrigin = hostOriginFromQuery;
        }
        const themeParam = searchParams.get("theme");
        if (themeParam === "light" || themeParam === "dark") {
          sdkThemeOverride = themeParam;
        }
      }

      if (
        providerType === "discord" ||
        providerType === "x" ||
        providerType === "github"
      ) {
        const urlParams = new URLSearchParams(window.location.search);
        const stateParam =
          urlParams.get(RedirectUriSearchParamsKey.STATE) || "{}";
        const oauthState = JSON.parse(atob(stateParam));
        hostOrigin = oauthState.targetOrigin;
        if (oauthState.theme === "light" || oauthState.theme === "dark") {
          sdkThemeOverride = oauthState.theme;
        }
      }

      if (!hostOrigin) {
        return;
      }

      const storageKey = useMemoryState.getState().storageKey || hostOrigin;
      const themeResult = determineTheme(sdkThemeOverride);

      setTheme(storageKey, themeResult.theme);
      setColorScheme(themeResult.theme);
      _setTheme(themeResult.theme);
    }

    fn();
  }, []);

  return _theme;
}
