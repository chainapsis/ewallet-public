import type { AuthType } from "@oko-wallet/oko-types/auth";

export interface AccountsChangedPayload {
  authType: AuthType | null;
  email: string | null;
  publicKey: string | null;
  name: string | null;
}

export type OkoWalletCoreEvent2 =
  | {
      type: "CORE__accountsChanged";
      authType: AuthType | null;
      email: string | null;
      publicKey: string | null;
      name: string | null;
    }
  | {
      type: "CORE__chainChanged";
    };

export type OkoWalletCoreEventHandler2 =
  | {
      type: "CORE__accountsChanged";
      handler: (payload: AccountsChangedPayload) => void;
    }
  | {
      type: "CORE__chainChanged";
      handler: (payload: undefined) => void;
    };
