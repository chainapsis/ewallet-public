import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import type { OkoWalletTheme } from "@oko-wallet/oko-sdk-core";

import { getSystemTheme } from "@oko-wallet-attached/components/google_callback/theme";
import { getThemeByHostOrigin } from "@oko-wallet-attached/requests/theme";

export function setColorScheme(theme: Theme) {
  const root = window.document.documentElement;

  root.setAttribute("data-theme", theme);

  // Clear the inline backgroundColor set by the index.html pre-paint script,
  // so the CSS variable from global.scss takes over.
  root.style.backgroundColor = "";

  // Update <meta name="theme-color"> so iOS Safari browser chrome matches.
  const themeColor = theme === "dark" ? "#0c0e12" : "#ffffff";
  const metaTags = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  for (const meta of metaTags) {
    meta.setAttribute("content", themeColor);
  }

  // Set color-scheme for popup/standalone contexts so iOS Safari
  // renders browser chrome (status bar, toolbar) in the correct theme.
  // NOTE - Applying color-scheme in an iframe causes a bug where,
  // if the host site doesn't have a color-scheme and the browser's default is dark,
  // the background changes to black. Only apply in popup context. @retto
  const isPopup = window.parent === window;
  if (isPopup) {
    root.style.colorScheme = theme;
  }
}

function resolveTheme(theme: Theme): Theme | null {
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  if (theme === "system") {
    return getSystemTheme();
  }
  return null;
}

export interface ThemeResult {
  theme: Theme;
  usesSystemPreference: boolean;
}

export async function determineTheme(
  hostOrigin: string,
  oldTheme: Theme | null,
  sdkThemeOverride?: OkoWalletTheme | null,
): Promise<ThemeResult> {
  const usesSystemFallback = oldTheme === null;
  const fallbackTheme: Theme = oldTheme ?? getSystemTheme();

  if (sdkThemeOverride) {
    return {
      theme: sdkThemeOverride,
      usesSystemPreference: false,
    };
  }

  const themeRes = await getThemeByHostOrigin(hostOrigin);

  if (themeRes.success) {
    const isSystem = themeRes.data === "system";
    const resolvedTheme = resolveTheme(themeRes.data);
    return {
      theme: resolvedTheme ?? fallbackTheme,
      usesSystemPreference:
        isSystem || (resolvedTheme === null && usesSystemFallback),
    };
  }

  return { theme: fallbackTheme, usesSystemPreference: usesSystemFallback };
}
