import React, { useCallback, useState } from "react";

import { SignWidget } from "../sign_widget/sign_widget";
import { useKeplrEwallet } from "@/components/keplr_ewallet_provider/use_keplr_ewallet";

const COSMOS_CHAIN_ID = "cosmoshub-4";

export const CosmosOffChainSignWidget = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const [isLoading, setIsLoading] = useState(false);

  const handleClickCosmosArbitrarySign = useCallback(async () => {
    console.log("handleClickCosmosArbitrarySign()");

    if (cosmosEWallet === null) {
      throw new Error("CosmosEWallet is not initialized");
    }
    try {
      setIsLoading(true);
      const account = await cosmosEWallet.getKey(COSMOS_CHAIN_ID);
      const address = account?.bech32Address;
      console.log("account", account);

      if (!address) {
        throw new Error("Address is not found");
      }

      const result = await cosmosEWallet.signArbitrary(
        COSMOS_CHAIN_ID,
        address,
        "Welcome to Keplr Embedded! 🚀 Try generating an MPC signature.",
      );

      console.log("SignDirect result:", result);
    } catch (error) {
      console.error("SignArbitrary failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [cosmosEWallet]);

  return (
    <SignWidget
      chain="Cosmos Hub"
      signType="offchain"
      signButtonOnClick={handleClickCosmosArbitrarySign}
      isLoading={isLoading}
    />
  );
};
