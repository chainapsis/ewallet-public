import type { Theme } from "@oko-wallet/oko-common-ui/theme";

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

  // NOTE - Applying a color-scheme to the body of an iframe causes a bug where,
  // if the host site doesn't have a color-scheme and the browser's default is dark,
  // the background changes to black.
  // Therefore, we force a light mode in the iframe(in sdk_core not here) @retto
  // root.style.colorScheme = "light dark";
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
): Promise<ThemeResult> {
  const usesSystemFallback = oldTheme === null;
  const fallbackTheme: Theme = oldTheme ?? getSystemTheme();

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
