import type { Theme } from "@oko-wallet/oko-common-ui/theme";
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

export function useSetThemeInCallback(providerType: AuthType) {
  const { getTheme } = useAppState();
  const initialTheme = getSystemTheme();
  const [_theme, _setTheme] = useState<Theme>(initialTheme);

  useLayoutEffect(() => {
    async function fn() {
      let hostOrigin: string | null = null;
      if (providerType === "google") {
        const oauthState = getOAuthStateFromUrl();
        hostOrigin = oauthState.targetOrigin;
      }

      if (providerType === "auth0") {
        const searchParams = new URLSearchParams(window.location.search);
        const hostOriginFromQuery = searchParams.get("host_origin");
        if (hostOriginFromQuery) {
          hostOrigin = hostOriginFromQuery;
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
        const targetOrigin: string = oauthState.targetOrigin;
        hostOrigin = targetOrigin;
      }

      if (!hostOrigin) {
        return;
      }

      const oldTheme = getTheme(hostOrigin);
      const { theme } = await determineTheme(hostOrigin, oldTheme);

      setColorScheme(theme);
      _setTheme(theme);
    }

    fn();
  }, []);

  return _theme;
}
