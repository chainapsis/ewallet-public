import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useEffect, useRef } from "react";

import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";

/**
 * Sets up app-specific SDK event listeners that update the Zustand user info store.
 *
 * - Cosmos `accountsChanged`: syncs auth state (email, name, publicKey)
 */
export function useSDKListeners() {
  const { cosmosWallet } = useOkoCosmos();
  const listenerRef = useRef(false);

  useEffect(() => {
    if (!cosmosWallet || listenerRef.current) {
      return;
    }
    listenerRef.current = true;

    cosmosWallet.on({
      type: "accountsChanged",
      handler: ({ email, name, publicKey }) => {
        useUserInfoState.getState().setUserInfo({
          email: email || null,
          name: name || null,
          publicKey: publicKey ? Buffer.from(publicKey).toString("hex") : null,
        });
      },
    });
  }, [cosmosWallet]);
}
