"use client";

import { useEffect, type FC } from "react";

import { useAuthState } from "@/state/auth";
import { useKeplrEwallet } from "@/components/keplr_ewallet_provider/use_keplr_ewallet";
import { TEST_COSMOS_CHAIN_ID } from "@/constants";

export const InitAuth: FC = () => {
  const authState = useAuthState.getState();
  const { cosmosEWallet, ethEWallet } = useKeplrEwallet();

  useEffect(() => {
    async function initializeAuth() {
      const wallet = cosmosEWallet?.eWallet ?? ethEWallet?.eWallet;
      if (!wallet || !cosmosEWallet || !ethEWallet) {
        return;
      }

      const isAlreadyAuthenticated = authState.email && authState.publicKey;
      if (!isAlreadyAuthenticated) {
        const [email, publicKey] = await Promise.all([
          wallet.getEmail(),
          wallet.getPublicKey(),
        ]);

        if (!email || !publicKey) {
          return;
        }

        authState.setEmail(email);
        authState.setPublicKey(publicKey);
      }

      const currentPublicKey =
        authState.publicKey || (await wallet.getPublicKey());
      if (!currentPublicKey) {
        return;
      }

      if (!authState.cosmosAddress) {
        const key = await cosmosEWallet.getKey(TEST_COSMOS_CHAIN_ID);
        authState.setCosmosAddress(key.bech32Address);
      }

      if (!authState.ethAddress) {
        const address = await ethEWallet.getAddress();
        authState.setEthAddress(address);
      }
    }

    initializeAuth().catch(console.error);
  }, [authState, cosmosEWallet, ethEWallet]);

  return null;
};
