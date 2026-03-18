import type { ResolvedTheme, SignInModalTheme } from "../types";

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function getHostTheme(): ResolvedTheme | null {
  if (typeof document === "undefined") {
    return null;
  }

  const root = document.documentElement;
  const body = document.body;

  const dataTheme = root.dataset.theme || body?.dataset.theme;
  if (dataTheme === "dark" || dataTheme === "light") {
    return dataTheme;
  }

  if (root.classList.contains("dark") || body?.classList.contains("dark")) {
    return "dark";
  }
  if (root.classList.contains("light") || body?.classList.contains("light")) {
    return "light";
  }

  const colorScheme = getComputedStyle(root).colorScheme;
  if (colorScheme === "dark" || colorScheme === "light") {
    return colorScheme;
  }

  return null;
}

export function resolveTheme(theme: SignInModalTheme): ResolvedTheme {
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  return getHostTheme() ?? getSystemTheme();
}

export function observeTheme(
  theme: SignInModalTheme,
  onChange: (resolved: ResolvedTheme) => void,
): () => void {
  onChange(resolveTheme(theme));

  if (theme !== "system") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    onChange(getHostTheme() ?? getSystemTheme());
  };

  mediaQuery.addEventListener("change", handler);
  return () => {
    mediaQuery.removeEventListener("change", handler);
  };
}
