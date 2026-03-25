import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useEffect } from "react";

import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";

/**
 * Sets up app-specific SDK event listeners that update the Zustand user info store.
 *
 * - Cosmos `accountsChanged`: syncs auth state (email, name, publicKey)
 */
export function useSDKListeners() {
  const { cosmosWallet } = useOkoCosmos();

  useEffect(() => {
    if (!cosmosWallet) {
      return;
    }

    const handler = ({
      email,
      name,
      publicKey,
    }: {
      email: string | null;
      name: string | null;
      publicKey: Uint8Array | null;
    }) => {
      useUserInfoState.getState().setUserInfo({
        email: email || null,
        name: name || null,
        publicKey: publicKey ? Buffer.from(publicKey).toString("hex") : null,
      });
    };

    cosmosWallet.on({
      type: "accountsChanged",
      handler,
    });

    return () => {
      cosmosWallet.off({
        type: "accountsChanged",
        handler,
      });
    };
  }, [cosmosWallet]);
}
