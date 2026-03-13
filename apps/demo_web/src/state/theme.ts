import { create } from "zustand";
import { combine, persist } from "zustand/middleware";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

export const THEME_STORAGE_KEY = "theme";
export const THEME_ATTRIBUTE = "data-theme";

export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var preference = 'system';
    if (stored) {
      var parsed = JSON.parse(stored);
      preference = parsed.state?.preference || 'system';
    }
    var theme = preference;
    if (preference === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('${THEME_ATTRIBUTE}', theme);
  } catch (e) {
    document.documentElement.setAttribute('${THEME_ATTRIBUTE}', 'light');
  }
})();
`;

interface ThemeState {
  preference: ThemePreference;
  theme: Theme;
}

interface ThemeAction {
  initialize: () => void;
  setPreference: (preference: ThemePreference) => void;
  setTheme: (theme: Theme) => void;
}

const getSystemTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (theme: Theme) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  }
};

const initialState: ThemeState = {
  preference: "system",
  theme: "light",
};

export const useThemeState = create(
  persist(
    combine<ThemeState, ThemeAction>(initialState, (set, get) => ({
      initialize: () => {
        const { preference } = get();
        const resolvedTheme =
          preference === "system" ? getSystemTheme() : preference;
        set({ theme: resolvedTheme });
      },

      setPreference: (preference: ThemePreference) => {
        const resolvedTheme =
          preference === "system" ? getSystemTheme() : preference;
        set({ preference, theme: resolvedTheme });
        applyTheme(resolvedTheme);
      },

      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme);
      },
    })),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ preference: state.preference }),
    },
  ),
);
