"use client";

import type { FC, PropsWithChildren } from "react";

import { useInitOko } from "@oko-wallet-demo-web/components/oko_provider/use_oko";
import { useThemeSync } from "@oko-wallet-demo-web/hooks/use_theme_sync";
import { useThemeSyncToIframe } from "@oko-wallet-demo-web/hooks/use_theme_sync_to_iframe";

export const OkoProvider: FC<PropsWithChildren> = ({ children }) => {
  useInitOko();
  useThemeSync();
  useThemeSyncToIframe();

  return <>{children}</>;
};
