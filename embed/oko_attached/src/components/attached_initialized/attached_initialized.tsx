"use client";

import { ThemeProvider } from "@oko-wallet/oko-common-ui/theme";
import type { FC, PropsWithChildren } from "react";

import { useInitializeApp } from "./use_initialize_app";
import { MobileModeProvider } from "@oko-wallet-attached/hooks/mobile_mode";

const isMobile =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("mobile") === "true";

export const AttachedInitialized: FC<PropsWithChildren> = ({ children }) => {
  const { theme } = useInitializeApp();

  return theme ? (
    <MobileModeProvider enabled={isMobile}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </MobileModeProvider>
  ) : null;
};
