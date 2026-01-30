"use client";

import {
  OkoSvmWallet,
  registerWalletStandard,
  type WalletStandardConfig,
} from "@oko-wallet/oko-sdk-svm";
import {
  SOLANA_CHAINS,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
} from "@solana/wallet-standard-chains";
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import { useCallback, useEffect, useState } from "react";

import { useSdkStore } from "@/store/sdk";
import { PublicKey } from "@solana/web3.js";

const SOLANA_CONFIG: WalletStandardConfig = {
  chains: SOLANA_CHAINS,
  features: {
    signIn: SolanaSignIn,
    signMessage: SolanaSignMessage,
    signTransaction: SolanaSignTransaction,
    signAndSendTransaction: SolanaSignAndSendTransaction,
  },
  rpcEndpoints: {
    [SOLANA_MAINNET_CHAIN]: "https://api.mainnet-beta.solana.com",
    [SOLANA_DEVNET_CHAIN]: "https://api.devnet.solana.com",
    [SOLANA_TESTNET_CHAIN]: "https://api.testnet.solana.com",
  },
};

export function useOkoSvm() {
  const {
    okoWallet,
    okoSvmWallet,
    isInitialized,
    isConnected,
    publicKey,
    setOkoWallet,
    setOkoSvmWallet,
    setInitialized,
    setConnected,
  } = useSdkStore();

  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize SDK
  useEffect(() => {
    if (isInitialized || isInitializing) {
      return;
    }

    const initSdk = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        // chain_id format: "namespace:genesisHash"
        const svmWalletResult = OkoSvmWallet.init({
          api_key: process.env.NEXT_PUBLIC_OKO_API_KEY!,
          sdk_endpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT,
          chain_id: SOLANA_MAINNET_CHAIN,
        });

        if (!svmWalletResult.success) {
          throw new Error(
            `Failed to init OkoSvmWallet: ${JSON.stringify(svmWalletResult.err)}`,
          );
        }

        const svmWallet = svmWalletResult.data;
        setOkoSvmWallet(svmWallet);

        // Get the internal OkoWallet instance
        const wallet = svmWallet.okoWallet;
        setOkoWallet(wallet);

        // Register wallet-standard
        registerWalletStandard(svmWallet, [SOLANA_CONFIG]);

        await svmWallet.waitUntilInitialized;
        console.log(
          "[sandbox_sol] Oko wallet initialized and registered with wallet-standard",
        );

        setInitialized(true);
        console.log("[sandbox_sol] SDK initialized");

        // Check for existing Ed25519 key (Solana uses Ed25519, not secp256k1)
        const existingEd25519Pubkey =
          await svmWallet.okoWallet.getPublicKeyEd25519();
        if (existingEd25519Pubkey) {
          await svmWallet.connect();
          console.log(
            "[sandbox_sol] Reconnected:",
            svmWallet.publicKey?.toBase58(),
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error("[sandbox_sol] Failed to initialize SDK:", message);
      } finally {
        setIsInitializing(false);
      }
    };

    initSdk();
  }, [
    isInitialized,
    isInitializing,
    setOkoWallet,
    setOkoSvmWallet,
    setInitialized,
  ]);

  useEffect(() => {
    if (!okoSvmWallet) {
      return;
    }

    const handleAccountChanged = (pk: PublicKey | null) => {
      const pubkeyStr = pk?.toBase58() ?? null;
      setConnected(!!pk, pubkeyStr);
      console.log("[sandbox_sol] accountChanged event:", pubkeyStr);
    };

    const handleConnect = (pk: PublicKey) => {
      setConnected(true, pk.toBase58());
      console.log("[sandbox_sol] connect event:", pk.toBase58());
    };

    const handleDisconnect = () => {
      setConnected(false, null);
      console.log("[sandbox_sol] disconnect event");
    };

    okoSvmWallet.on("accountChanged", handleAccountChanged);
    okoSvmWallet.on("connect", handleConnect);
    okoSvmWallet.on("disconnect", handleDisconnect);

    return () => {
      okoSvmWallet.off("accountChanged", handleAccountChanged);
      okoSvmWallet.off("connect", handleConnect);
      okoSvmWallet.off("disconnect", handleDisconnect);
    };
  }, [okoSvmWallet, setConnected]);

  const connect = useCallback(async () => {
    if (!okoSvmWallet) {
      setError("SDK not initialized");
      return;
    }

    try {
      setError(null);

      // Check if user is signed in
      const existingPubkey = await okoSvmWallet.okoWallet.getPublicKey();
      if (!existingPubkey) {
        // Not signed in - open provider select modal
        await okoSvmWallet.okoWallet.openSignInModal();
      }

      // connect() internally handles Ed25519 key creation if needed
      await okoSvmWallet.connect();
      console.log(
        "[sandbox_sol] Connected:",
        okoSvmWallet.publicKey?.toBase58(),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("[sandbox_sol] Failed to connect:", message);
    }
  }, [okoSvmWallet]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (!okoSvmWallet) {
      return;
    }

    try {
      await okoSvmWallet.disconnect();
      console.log("[sandbox_sol] Disconnected");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("[sandbox_sol] Failed to disconnect:", message);
    }
  }, [okoSvmWallet]);

  return {
    okoWallet,
    okoSvmWallet,
    isInitialized,
    isInitializing,
    isConnected,
    publicKey,
    error,
    connect,
    disconnect,
  };
}
