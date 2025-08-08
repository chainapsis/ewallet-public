import { combine } from "zustand/middleware";
import { create } from "zustand";

interface AuthState {
  email: string | null;
  publicKey: string | null;
  ethAddress: string | null;
  cosmosAddress: string | null;
}

interface AuthAction {
  setEmail: (email: string) => void;
  setPublicKey: (publicKey: string) => void;
  setEthAddress: (ethAddress: string) => void;
  setCosmosAddress: (cosmosAddress: string) => void;
  reset: () => void;
}

export const useAuthState = create(
  combine<AuthState, AuthAction>(
    {
      email: null,
      publicKey: null,
      ethAddress: null,
      cosmosAddress: null,
    },
    (set) => ({
      setEmail: (email: string) => set({ email }),
      setPublicKey: (publicKey: string) => set({ publicKey }),
      setEthAddress: (ethAddress: string) => set({ ethAddress }),
      setCosmosAddress: (cosmosAddress: string) => set({ cosmosAddress }),
      reset: () =>
        set({
          email: null,
          publicKey: null,
          ethAddress: null,
          cosmosAddress: null,
        }),
    }),
  ),
);
