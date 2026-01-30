import type { AuthType } from "@oko-wallet/oko-types/auth";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";

interface UserInfoState {
  email: string | null;
  publicKey: string | null;
  isSignedIn: boolean;
  authType: AuthType | null;
}

interface UserInfoActions {
  setUserInfo: (info: {
    email: string | null;
    publicKey: string | null;
  }) => void;
  setAuthType: (authType: AuthType | null) => void;
  clearUserInfo: () => void;
}

export const useUserInfoState = create(
  persist(
    combine<UserInfoState, UserInfoActions>(
      {
        email: null,
        publicKey: null,
        isSignedIn: false,
        authType: null,
      },
      (set) => ({
        setUserInfo: (info) => {
          set({
            email: info.email,
            publicKey: info.publicKey,
            isSignedIn: !!(info.email && info.publicKey),
          });
        },
        setAuthType: (authType) => {
          set({ authType });
        },
        clearUserInfo: () => {
          set({
            email: null,
            publicKey: null,
            isSignedIn: false,
            authType: null,
          });
        },
      }),
    ),
    {
      name: "oko:user_dashboard:user_info",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ authType: state.authType }),
    },
  ),
);
