/**
 * Chain preferences management with Zustand
 * Only stores user preferences (enabled chains per user)
 * Chain data is managed by TanStack Query in hooks/queries/use_chains.ts
 */

import { ChainIdHelper } from "@keplr-wallet/cosmos";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  CosmosChainInfo,
  ModularChainInfo,
} from "@oko-wallet-user-dashboard/types/chain";

const STORAGE_KEY = "oko:user_dashboard:chains";
export const DEFAULT_ENABLED_CHAINS = [
  "eip155:1",
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "cosmoshub",
  "osmosis",
] as const;

// Cache for ChainIdHelper.parse() results
const chainIdentifierCache = new Map<string, string>();

/**
 * Get chain identifier with caching to avoid repeated parsing
 */
export function getChainIdentifier(chainId: string): string {
  let identifier = chainIdentifierCache.get(chainId);
  if (!identifier) {
    identifier = ChainIdHelper.parse(chainId).identifier;
    chainIdentifierCache.set(chainId, identifier);
  }
  return identifier;
}

type UserKey = `${AuthType}/${string}`;
const ANONYMOUS_USER_KEY = "__anonymous__";

function createUserKey(authType: AuthType, email: string): UserKey {
  return `${authType}/${email.trim()}`;
}

function resolveKey(state: ChainPreferencesState): string {
  return state.activeUserKey ?? ANONYMOUS_USER_KEY;
}

function getEnabledChains(state: ChainPreferencesState): string[] {
  return (
    state.enabledChainsByUser[resolveKey(state)] ?? [...DEFAULT_ENABLED_CHAINS]
  );
}

function updateEnabledChains(
  state: ChainPreferencesState,
  updater: (chains: Set<string>) => void,
): Pick<ChainPreferencesState, "enabledChainsByUser"> {
  const key = resolveKey(state);
  const chains = new Set(getEnabledChains(state));
  updater(chains);
  return {
    enabledChainsByUser: {
      ...state.enabledChainsByUser,
      [key]: Array.from(chains),
    },
  };
}

interface ChainPreferencesState {
  enabledChainsByUser: Record<string, string[]>;
  activeUserKey: UserKey | null;
}

interface ChainPreferencesActions {
  setActiveUser: (authType: AuthType, email: string) => void;
  clearActiveUser: () => void;
  enableChains: (...chainIds: string[]) => void;
  disableChains: (...chainIds: string[]) => void;
  isChainEnabled: (chainId: string) => boolean;
  getEnabledChainIds: () => string[];
}

export const useChainStore = create<
  ChainPreferencesState & ChainPreferencesActions
>()(
  persist(
    (set, get) => ({
      enabledChainsByUser: {},
      activeUserKey: null,

      setActiveUser: (authType, email) => {
        set({ activeUserKey: createUserKey(authType, email) });
      },

      clearActiveUser: () => {
        set({ activeUserKey: null });
      },

      enableChains: (...chainIds) => {
        set(
          updateEnabledChains(get(), (chains) => {
            for (const id of chainIds) {
              chains.add(getChainIdentifier(id));
            }
          }),
        );
      },

      disableChains: (...chainIds) => {
        set(
          updateEnabledChains(get(), (chains) => {
            for (const id of chainIds) {
              chains.delete(getChainIdentifier(id));
            }
          }),
        );
      },

      isChainEnabled: (chainId) =>
        getEnabledChains(get()).includes(getChainIdentifier(chainId)),

      getEnabledChainIds: () => getEnabledChains(get()),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabledChainsByUser: state.enabledChainsByUser,
      }),
    },
  ),
);

export function transformKeplrChain(chain: CosmosChainInfo): ModularChainInfo {
  const isSVM = !!chain.svm;
  const isCosmos = !!chain.bech32Config;
  const isEVM = !!chain.evm;

  const base = {
    chainId: chain.chainId,
    chainName: chain.chainName,
    chainSymbolImageUrl: chain.chainSymbolImageUrl,
    isTestnet: chain.isTestnet,
  };

  if (isSVM) {
    return {
      ...base,
      svm: {
        rpc: chain.svm!.rpc,
        currencies: chain.currencies,
      },
    };
  }

  if (isCosmos) {
    return {
      ...base,
      isNative: true,
      cosmos: chain,
      evm: isEVM
        ? {
            chainId: chain.evm!.chainId,
            rpc: chain.evm!.rpc,
            currencies: chain.currencies,
            feeCurrencies: chain.feeCurrencies,
            bip44: chain.bip44,
            features: chain.features,
          }
        : undefined,
    };
  }

  if (isEVM) {
    return {
      ...base,
      evm: {
        chainId: chain.evm!.chainId,
        rpc: chain.evm!.rpc,
        currencies: chain.currencies,
        feeCurrencies: chain.feeCurrencies,
        bip44: chain.bip44,
        features: chain.features,
      },
    };
  }

  return base;
}
