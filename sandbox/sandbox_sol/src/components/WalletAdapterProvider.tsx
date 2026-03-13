"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletAdapterProviderProps {
  children: React.ReactNode;
}

export function WalletAdapterProvider({
  children,
}: WalletAdapterProviderProps) {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  // No wallets array needed - wallet-standard wallets are auto-discovered
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
