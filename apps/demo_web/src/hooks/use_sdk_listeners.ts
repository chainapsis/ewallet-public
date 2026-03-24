import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import { useEffect, useRef } from "react";

import { useUserInfoState } from "@oko-wallet-demo-web/state/user_info";

/**
 * Sets up app-specific SDK event listeners that update the Zustand user info store.
 *
 * - Cosmos `accountsChanged`: syncs auth state, forces sign out for V1 users without Ed25519 key
 * - SVM `accountChanged`: tracks Ed25519 public key
 */
export function useSDKListeners() {
  const { cosmosWallet } = useOkoCosmos();
  const { svmWallet } = useOkoSvm();
  const cosmosListenerRef = useRef(false);
  const svmListenerRef = useRef(false);

  useEffect(() => {
    if (!cosmosWallet || cosmosListenerRef.current) {
      return;
    }
    cosmosListenerRef.current = true;

    const setUserInfo = useUserInfoState.getState().setUserInfo;

    cosmosWallet.on({
      type: "accountsChanged",
      handler: async ({ authType, email, publicKey, name }) => {
        if (publicKey) {
          const ed25519Key = await cosmosWallet.okoWallet.getPublicKeyEd25519();

          if (!ed25519Key) {
            console.warn(
              "[Demo] Signed-in user has no Ed25519 wallet. Forcing sign out.",
            );
            cosmosWallet.okoWallet.signOut();
            return;
          }
        }

        setUserInfo({
          authType: authType || null,
          email: email || null,
          publicKey: publicKey ? Buffer.from(publicKey).toString("hex") : null,
          name: name || null,
        });
      },
    });
  }, [cosmosWallet]);

  useEffect(() => {
    if (!svmWallet || svmListenerRef.current) {
      return;
    }
    svmListenerRef.current = true;

    const setPublicKeyEd25519 = useUserInfoState.getState().setPublicKeyEd25519;

    svmWallet.on("accountChanged", () => {
      const ed25519Key = svmWallet.state.publicKeyRaw;
      setPublicKeyEd25519(ed25519Key);
    });
  }, [svmWallet]);
}
