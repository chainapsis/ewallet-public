"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  AccountStore,
  useAccountStore,
} from "@keplr-ewallet-sandbox-osmosis/stores/account";
import {
  initKeplrEwalletCore,
  KeplrEWallet,
} from "@keplr-ewallet/ewallet-sdk-core";
import { initCosmosEWallet } from "@keplr-ewallet/ewallet-sdk-cosmos";
import type { CosmosEWallet } from "@keplr-ewallet/ewallet-sdk-cosmos";
import { WalletSelectModal } from "@keplr-ewallet-sandbox-osmosis/components/WalletSelectModal";
import { WalletConfig } from "@keplr-ewallet-sandbox-osmosis/config/wallet-registry";

interface WalletSelectParams {
  walletOptions: Array<{
    walletType: "cosmos" | "evm";
    chainId?: string;
  }>;
  onConnect?: (params: { walletType: "cosmos" | "evm" }) => void;
  onError?: (error: Error) => void;
}

interface WalletSelectContextType {
  onOpenWalletSelect: (params: WalletSelectParams) => void;
  isOpen: boolean;
  isLoading: boolean;
  accountStore: AccountStore;
  eWallet: KeplrEWallet | null;
  cosmosWallet: CosmosEWallet | null;
  isEwalletInitialized: boolean;
}

const WalletSelectContext = createContext<WalletSelectContextType | null>(null);

export const useWalletSelect = () => {
  const context = useContext(WalletSelectContext);
  if (!context) {
    throw new Error("useWalletSelect must be used within WalletSelectProvider");
  }
  return context;
};

export const WalletSelectProvider = ({ children }: { children: ReactNode }) => {
  const [isWalletSelectOpen, setIsWalletSelectOpen] = useState(false);
  const [walletSelectParams, setWalletSelectParams] =
    useState<WalletSelectParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eWallet related state
  const [eWallet, setEWallet] = useState<KeplrEWallet | null>(null);
  const [cosmosWallet, setCosmosWallet] = useState<CosmosEWallet | null>(null);
  const [isEwalletInitialized, setIsEwalletInitialized] = useState(false);

  // Use Zustand store instead of creating new instance

  const onOpenWalletSelect = useCallback((params: WalletSelectParams) => {
    setIsWalletSelectOpen(true);
    setWalletSelectParams(params);
  }, []);

  const onCloseWalletSelect = useCallback(() => {
    setIsWalletSelectOpen(false);
    setWalletSelectParams(null);
    setError(null);
  }, []);

  const handleWalletSelect = useCallback(
    async (wallet: WalletConfig) => {
      setIsLoading(true);
      setError(null);

      try {
        await useAccountStore.getState().connectWallet(wallet);
        walletSelectParams?.onConnect?.({ walletType: "cosmos" });
        onCloseWalletSelect();
      } catch (error) {
        console.error(`Failed to connect ${wallet.name}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        walletSelectParams?.onError?.(
          error instanceof Error ? error : new Error(errorMessage),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [walletSelectParams, onCloseWalletSelect],
  );

  // Keep the legacy method for backward compatibility
  const handleEwalletConnect = useCallback(
    async (method: "google") => {
      setIsLoading(true);
      setError(null);

      try {
        await useAccountStore.getState().connectEWallet(method);
        walletSelectParams?.onConnect?.({ walletType: "cosmos" });
        onCloseWalletSelect();
      } catch (error) {
        console.error("Failed to connect eWallet:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        walletSelectParams?.onError?.(
          error instanceof Error ? error : new Error(errorMessage),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [walletSelectParams, onCloseWalletSelect],
  );

  // eWallet initialization and AccountStore connection
  useEffect(() => {
    const initEwallet = async () => {
      try {
        const result = await initKeplrEwalletCore({
          customerId: "afb0afd1-d66d-4531-981c-cbf3fb1507b9", // TODO: replace with actual customerId
        });
        if (result.success) {
          setEWallet(result.data);
          setIsEwalletInitialized(true);

          // Initialize Cosmos wallet
          const cosmosWalletInstance = await initCosmosEWallet({
            eWallet: result.data,
          });
          setCosmosWallet(cosmosWalletInstance);

          // Update eWallet state in AccountStore
          const accountStore = useAccountStore.getState();
          accountStore.setEWallet(result.data);
          accountStore.setCosmosWallet(cosmosWalletInstance);
        } else {
          console.error("Failed to initialize eWallet:", result.err);
          setIsEwalletInitialized(false);
        }
      } catch (error) {
        console.error("Failed to initialize eWallet:", error);
        setIsEwalletInitialized(false);
      }
    };

    initEwallet();
  }, []);

  const contextValue = useMemo(
    () => ({
      onOpenWalletSelect,
      isOpen: isWalletSelectOpen,
      isLoading,
      accountStore: new AccountStore(), // Legacy compatibility
      eWallet,
      cosmosWallet,
      isEwalletInitialized,
    }),
    [
      onOpenWalletSelect,
      isWalletSelectOpen,
      isLoading,
      eWallet,
      cosmosWallet,
      isEwalletInitialized,
    ],
  );

  return (
    <WalletSelectContext.Provider value={contextValue}>
      {children}
      <WalletSelectModal
        isOpen={isWalletSelectOpen}
        onClose={onCloseWalletSelect}
        onWalletSelect={handleWalletSelect}
        onEwalletConnect={handleEwalletConnect}
        isConnecting={isLoading}
        error={error}
        onErrorDismiss={() => setError(null)}
      />
    </WalletSelectContext.Provider>
  );
};
