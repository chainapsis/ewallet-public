import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import { useEffect } from "react";

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

  useEffect(() => {
    if (!cosmosWallet) {
      return;
    }

    const setUserInfo = useUserInfoState.getState().setUserInfo;

    const handler = async ({
      authType,
      email,
      publicKey,
      name,
    }: {
      authType: unknown;
      email: string | null;
      publicKey: Uint8Array | null;
      name: string | null;
    }) => {
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

  useEffect(() => {
    if (!svmWallet) {
      return;
    }

    const setPublicKeyEd25519 = useUserInfoState.getState().setPublicKeyEd25519;

    const handler = () => {
      const ed25519Key = svmWallet.state.publicKeyRaw;
      setPublicKeyEd25519(ed25519Key);
    };

    svmWallet.on("accountChanged", handler);

    return () => {
      svmWallet.off("accountChanged", handler);
    };
  }, [svmWallet]);
}
