"use client";

import { ThemeProvider } from "@oko-wallet/oko-common-ui/theme";
import type { FC, PropsWithChildren } from "react";

import { useInitializeApp } from "./use_initialize_app";
import { MobileModeProvider } from "@oko-wallet-attached/hooks/mobile_mode";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

const isMobile =
  typeof window !== "undefined" &&
  (() => {
    const searchParams = new URLSearchParams(window.location.search);
    return (
      searchParams.get("mobile") === "true" ||
      searchParams.get("mobile_native") === "true"
    );
  })();

export const AttachedInitialized: FC<PropsWithChildren> = ({ children }) => {
  const { theme: initTheme } = useInitializeApp();
  const memoryTheme = useMemoryState((s) => s.resolvedTheme);

  // After initialization, prefer memory store theme (updated by set_theme messages)
  const theme = memoryTheme ?? initTheme;

  return theme ? (
    <MobileModeProvider enabled={isMobile}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </MobileModeProvider>
  ) : null;
};
