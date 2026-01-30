"use client";

import {
  useActiveAccount,
  useDisconnectWallet,
  useIsConnected,
  useWallets,
} from "@rialo/frost";
import { useEffect } from "react";

import ConnectedView from "@/components/ConnectedView";
import LoginView from "@/components/LoginView";

export default function Home() {
  const isConnected = useIsConnected();
  const activeAccount = useActiveAccount();
  const wallets = useWallets();
  const { mutate: disconnect } = useDisconnectWallet();

  useEffect(() => {
    console.log(
      "[sandbox_frost_kit] Available wallets:",
      wallets.map((w) => w.name),
    );
  }, [wallets]);

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      {!isConnected ? (
        <LoginView />
      ) : (
        <ConnectedView
          publicKey={activeAccount?.address ?? ""}
          onDisconnect={handleDisconnect}
        />
      )}
    </main>
  );
}
