import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { KEPLR_CHAIN_REGISTRY_ENDPOINT } from "@oko-wallet-user-dashboard/fetch";
import { getChainIdentifier } from "@oko-wallet-user-dashboard/utils/chain";

const STORAGE_KEY = "oko:user_dashboard:native_chains";
const NATIVE_CHAINS_API = `${KEPLR_CHAIN_REGISTRY_ENDPOINT}/api/native-chains-with-evm`;

interface NativeChainsState {
  chainIds: string[];
  chainIdentifiers: string[];
  fetchedAt: number | null;
}

interface NativeChainsActions {
  fetchNativeChains: () => Promise<void>;
  isNativeChain: (chainId: string) => boolean;
}

export const useNativeChainsStore = create<
  NativeChainsState & NativeChainsActions
>()(
  persist(
    (set, get) => ({
      chainIds: [],
      chainIdentifiers: [],
      fetchedAt: null,

      fetchNativeChains: async () => {
        try {
          const res = await fetch(NATIVE_CHAINS_API);
          if (!res.ok) {
            throw new Error(`Failed to fetch native chains: ${res.status}`);
          }
          const data: { mainnetChains: { chainId: string }[] } =
            await res.json();
          const chainIds = data.mainnetChains.map((c) => c.chainId);
          set({
            chainIds,
            fetchedAt: Date.now(),
            chainIdentifiers: chainIds.map((c) => getChainIdentifier(c)),
          });
        } catch {}
      },

      isNativeChain: (chainId: string) => {
        return get().chainIds.includes(chainId);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        chainIds: state.chainIds,
        fetchedAt: state.fetchedAt,
        chainIdentifiers: state.chainIdentifiers,
      }),
    },
  ),
);
