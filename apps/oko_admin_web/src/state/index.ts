import { create } from "zustand";
import { combine, persist } from "zustand/middleware";

import type {
  LoginActions,
  LoginState,
  UserState,
} from "@oko-wallet-admin/state/types";

const STORAGE_KEY = "oko_wallet";

export const useAppState = create(
  persist(
    combine<LoginState, LoginActions>(
      { user: null, token: null, isHydrated: false },
      (set) => ({
        setUserState: (user: UserState, token: string) => {
          set((state) => ({ ...state, user, token }));
        },
        resetUserState: () => {
          set((state) => ({ ...state, user: null, token: null }));
        },
      }),
    ),
    {
      name: STORAGE_KEY,
    },
  ),
);
