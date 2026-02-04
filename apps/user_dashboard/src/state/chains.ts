/**
 * Chain preferences management with Zustand
 * Only stores user preferences (enabled chains per user)
 * Chain data is managed by TanStack Query in hooks/queries/use_chains.ts
 */

import type { AuthType } from "@oko-wallet/oko-types/auth";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  ETHEREUM_MAINNET_CHAIN_ID,
  SOLANA_MAINNET_CHAIN_ID,
  getChainIdentifier,
} from "@oko-wallet-user-dashboard/utils/chain";

const STORAGE_KEY = "oko:user_dashboard:chains";
export const DEFAULT_ENABLED_CHAINS = [
  ETHEREUM_MAINNET_CHAIN_ID,
  SOLANA_MAINNET_CHAIN_ID,
  "cosmoshub",
  "osmosis",
] as const;

type UserKey = `${AuthType}/${string}`;

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

function createUserKey(authType: AuthType, email: string): UserKey {
  return `${authType}/${email.trim()}`;
}

function getEnabledChains(state: ChainPreferencesState): string[] {
  if (!state.activeUserKey) {
    return [...DEFAULT_ENABLED_CHAINS];
  }
  return (
    state.enabledChainsByUser[state.activeUserKey] ?? [
      ...DEFAULT_ENABLED_CHAINS,
    ]
  );
}

function updateEnabledChains(
  state: ChainPreferencesState,
  updater: (chains: Set<string>) => void,
): Partial<Pick<ChainPreferencesState, "enabledChainsByUser">> {
  if (!state.activeUserKey) {
    return {};
  }
  const chains = new Set(getEnabledChains(state));
  updater(chains);
  return {
    enabledChainsByUser: {
      ...state.enabledChainsByUser,
      [state.activeUserKey]: Array.from(chains),
    },
  };
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
