"use client";

import type { FC, PropsWithChildren } from "react";

import { useInitOko } from "@oko-wallet-demo-web/components/oko_provider/use_oko";
import { useThemeSync } from "@oko-wallet-demo-web/hooks/use_theme_sync";

export const OkoProvider: FC<PropsWithChildren> = ({ children }) => {
  useInitOko();
  useThemeSync();

  return <>{children}</>;
};
