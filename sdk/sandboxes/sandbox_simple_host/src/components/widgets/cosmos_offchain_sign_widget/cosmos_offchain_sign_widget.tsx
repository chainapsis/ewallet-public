import React, { useCallback, useEffect, useState } from "react";
import {
  CosmosEWallet,
  initCosmosEWallet,
} from "@keplr-ewallet/ewallet-sdk-cosmos";
import { CosmosIcon } from "@keplr-ewallet/ewallet-common-ui/icons/cosmos_icon";

import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";
import { SignWidget } from "@keplr-ewallet-demo-web/components/widgets/sign_widget/sign_widget";

const COSMOS_CHAIN_ID = "cosmoshub-4";

export const CosmosOffChainSignWidget = () => {
  const { eWallet } = useKeplrEwallet();
  const [isLoading, setIsLoading] = useState(false);

  const [cosmosEWallet, setCosmosEWallet] = useState<CosmosEWallet | null>(
    null,
  );

  useEffect(() => {
    if (eWallet) {
      initCosmosEWallet({ eWallet }).then((res) => {
        setCosmosEWallet(res);
      });
    }
  }, [eWallet, setCosmosEWallet]);

  const handleClickCosmosArbitrarySign = useCallback(async () => {
    console.log("handleClickCosmosArbitrarySign()");

    if (cosmosEWallet !== null) {
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
        console.error("SignDirect failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [cosmosEWallet]);

  return (
    <SignWidget
      chain="Cosmos Hub"
      chainIcon={<CosmosIcon />}
      signType="offchain"
      isLoading={isLoading}
      signButtonOnClick={handleClickCosmosArbitrarySign}
    />
  );
};
