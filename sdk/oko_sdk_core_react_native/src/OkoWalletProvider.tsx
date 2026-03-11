import React, { createContext, useMemo } from "react";
import { OkoWalletRN, type OkoWalletRNConfig } from "./OkoWalletRN";

export const OkoWalletContext = createContext<OkoWalletRN | null>(null);

export interface OkoWalletProviderProps {
  /** Oko API key */
  apiKey: string;
  /** Proxy endpoint for OS browser flows (e.g. https://proxy.oko.app) */
  sdkEndpoint: string;
  /** Deep link scheme for OAuth callbacks (default: "okowallet") */
  redirectScheme?: string;
  children: React.ReactNode;
}

export function OkoWalletProvider({
  apiKey,
  sdkEndpoint,
  redirectScheme,
  children,
}: OkoWalletProviderProps) {
  const wallet = useMemo(() => {
    const config: OkoWalletRNConfig = {
      apiKey,
      sdkEndpoint,
      redirectScheme,
    };
    return new OkoWalletRN(config);
  }, [apiKey, sdkEndpoint, redirectScheme]);

  return (
    <OkoWalletContext.Provider value={wallet}>
      {children}
    </OkoWalletContext.Provider>
  );
}
