"use client";

import { type FC, type PropsWithChildren } from "react";
import { ThemeProvider } from "@oko-wallet/oko-common-ui/theme";

import { useInitializeApp } from "./use_initialize_app";

export const AttachedInitialized: FC<PropsWithChildren> = ({ children }) => {
  const { theme } = useInitializeApp();

  return theme ? (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  ) : (
    null
  );
};
