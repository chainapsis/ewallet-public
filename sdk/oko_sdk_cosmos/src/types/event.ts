import type { Key } from "@keplr-wallet/types";
import type { AuthType } from "@oko-wallet/oko-types/auth";

export interface AccountChangePayload {
  authType: AuthType | null;
  email: string | null;
  publicKey: Key["pubKey"] | null;
  name: string | null;
}

export type OkoCosmosWalletEvent2 =
  | ({
      type: "accountsChanged";
    } & AccountChangePayload)
  | {
      type: "chainChanged";
    };

export type OkoCosmosWalletEventHandler2 =
  | {
      type: "accountsChanged";
      handler: (payload: AccountChangePayload) => void;
    }
  | {
      type: "chainChanged";
      handler: (payload: undefined) => void;
    };
