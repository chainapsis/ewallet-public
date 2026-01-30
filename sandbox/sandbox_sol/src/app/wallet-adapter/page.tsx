"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  WalletDisconnectButton,
} from "@solana/wallet-adapter-react-ui";
import { WalletAdapterProvider } from "@/components/WalletAdapterProvider";
import { useOkoSvm } from "@/hooks/use_oko_svm";

function WalletAdapterContent() {
  const { isInitialized, isInitializing } = useOkoSvm();
  const { publicKey, connected, wallet, wallets } = useWallet();

  useEffect(() => {
    console.log("[wallet-adapter] Available wallets:", wallets);
  }, [wallets]);

  if (isInitializing) {
    return (
      <div className="text-center">
        <p className="text-gray-400">Initializing Oko SDK...</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="text-center">
        <p className="text-red-400">Failed to initialize SDK</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Wallet Adapter Test</h1>
        <p className="text-gray-400 text-sm">
          Testing wallet-standard integration with @solana/wallet-adapter
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <WalletMultiButton />
        {connected && <WalletDisconnectButton />}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Status</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Connected:</span>
            <span className={connected ? "text-green-400" : "text-red-400"}>
              {connected ? "Yes" : "No"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Wallet:</span>
            <span>{wallet?.adapter.name ?? "None"}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Public Key:</span>
            <span className="font-mono text-xs">
              {publicKey?.toBase58().slice(0, 20)}...
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Discovered Wallets</h2>
        <div className="space-y-2">
          {wallets.length === 0 ? (
            <p className="text-gray-400 text-sm">No wallets discovered</p>
          ) : (
            wallets.map((w) => (
              <div
                key={w.adapter.name}
                className="flex items-center gap-3 p-2 bg-gray-700 rounded"
              >
                {w.adapter.icon && (
                  <img
                    src={w.adapter.icon}
                    alt={w.adapter.name}
                    className="w-6 h-6"
                  />
                )}
                <span>{w.adapter.name}</span>
                <span className="text-xs text-gray-400">({w.readyState})</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-center">
        <a href="/" className="text-blue-400 hover:underline text-sm">
          Back to Direct API Test
        </a>
      </div>
    </div>
  );
}

export default function WalletAdapterPage() {
  return (
    <WalletAdapterProvider>
      <main className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <WalletAdapterContent />
        </div>
      </main>
    </WalletAdapterProvider>
  );
}
