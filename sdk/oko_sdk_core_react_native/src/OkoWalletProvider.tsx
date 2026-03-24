import type React from "react";
import { createContext, useMemo } from "react";

import { OkoWalletRN, type OkoWalletRNConfig } from "./OkoWalletRN";

export const OkoWalletContext = createContext<OkoWalletRN | null>(null);

export interface OkoWalletProviderProps {
  /** Oko API key */
  apiKey: string;
  /** Mobile host endpoint for OS browser flows (e.g. https://mobile.oko.app) */
  sdkEndpoint?: string;
  /** Deep link scheme for OAuth callbacks (default: "okowallet") */
  redirectScheme?: string;
  /** Android-only callback scheme for OkoAuthCallbackActivity (default: "oko.auth.callback").
   *  Must match `callbackScheme` in the Expo config plugin (or your AndroidManifest intent-filter). */
  androidCallbackScheme?: string;
  children: React.ReactNode;
}

export function OkoWalletProvider({
  apiKey,
  sdkEndpoint,
  redirectScheme,
  androidCallbackScheme,
  children,
}: OkoWalletProviderProps) {
  const wallet = useMemo(() => {
    const config: OkoWalletRNConfig = {
      apiKey,
      sdkEndpoint,
      redirectScheme,
      androidCallbackScheme,
    };
    return new OkoWalletRN(config);
  }, [apiKey, sdkEndpoint, redirectScheme, androidCallbackScheme]);

  return (
    <OkoWalletContext.Provider value={wallet}>
      {children}
    </OkoWalletContext.Provider>
  );
}
