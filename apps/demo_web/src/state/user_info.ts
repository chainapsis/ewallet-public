import type { AuthType } from "@oko-wallet/oko-types/auth";
import { create } from "zustand";
import { combine } from "zustand/middleware";

interface UserInfoState {
  authType: AuthType | null;
  email: string | null;
  publicKeySecp256k1: string | null;
  publicKeyEd25519: string | null;
  name: string | null;
  isSignedIn: boolean;
}

interface UserInfoActions {
  setUserInfo: (info: {
    authType: AuthType | null;
    email: string | null;
    publicKey: string | null;
    publicKeyEd25519?: string | null;
    name?: string | null;
  }) => void;
  setPublicKeyEd25519: (publicKeyEd25519: string | null) => void;
  clearUserInfo: () => void;
}

export const useUserInfoState = create(
  combine<UserInfoState, UserInfoActions>(
    {
      authType: null,
      email: null,
      publicKeySecp256k1: null,
      publicKeyEd25519: null,
      name: null,
      isSignedIn: false,
    },
    (set) => ({
      setUserInfo: (info) => {
        set({
          authType: info.authType,
          email: info.email ?? null,
          publicKeySecp256k1: info.publicKey,
          publicKeyEd25519: info.publicKeyEd25519 ?? null,
          name: info.name ?? null,
          isSignedIn: !!info.publicKey,
        });
      },
      setPublicKeyEd25519: (publicKeyEd25519) => {
        set({ publicKeyEd25519 });
      },
      clearUserInfo: () => {
        set({
          authType: null,
          email: null,
          publicKeySecp256k1: null,
          publicKeyEd25519: null,
          name: null,
          isSignedIn: false,
        });
      },
    }),
  ),
);
