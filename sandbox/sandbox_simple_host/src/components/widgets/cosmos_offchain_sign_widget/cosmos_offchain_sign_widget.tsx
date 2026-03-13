import { useCallback, useState } from "react";

import { useOko } from "@/hooks/use_oko";
import { SignWidget } from "../sign_widget/sign_widget";

const COSMOS_CHAIN_ID = "cosmoshub-4";

export const CosmosOffChainSignWidget = () => {
  const { okoCosmos } = useOko();
  const [isLoading, setIsLoading] = useState(false);

  const handleClickCosmosArbitrarySign = useCallback(async () => {
    console.log("handleClickCosmosArbitrarySign()");

    if (okoCosmos === null) {
      throw new Error("okoCosmos is not initialized");
    }
    try {
      setIsLoading(true);
      const account = await okoCosmos.getKey(COSMOS_CHAIN_ID);
      const address = account?.bech32Address;
      console.log("account", account);

      if (!address) {
        throw new Error("Address is not found");
      }

      const result = await okoCosmos.signArbitrary(
        COSMOS_CHAIN_ID,
        address,
        "Welcome to Oko! 🚀 Try generating an MPC signature.",
      );

      console.log("SignDirect result:", result);
    } catch (error) {
      console.error("SignArbitrary failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [okoCosmos]);

  return (
    <SignWidget
      chain="Cosmos Hub"
      signType="offchain"
      signButtonOnClick={handleClickCosmosArbitrarySign}
      isLoading={isLoading}
    />
  );
};
