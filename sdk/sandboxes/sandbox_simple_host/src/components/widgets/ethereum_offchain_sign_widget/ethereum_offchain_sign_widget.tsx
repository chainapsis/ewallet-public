import React, { useEffect, useState } from "react";
import {
  initEthEWallet,
  type EthEWallet,
} from "@keplr-ewallet/ewallet-sdk-eth";
import { EthereumIcon } from "@keplr-ewallet/ewallet-common-ui/icons/ethereum_icon";

import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";
import { SignWidget } from "@keplr-ewallet-demo-web/components/widgets/sign_widget/sign_widget";

export const EthereumOffchainSignWidget = () => {
  const { eWallet } = useKeplrEwallet();
  const [isLoading, setIsLoading] = useState(false);

  const [ethEWallet, setEthEWallet] = useState<EthEWallet | null>(null);

  useEffect(() => {
    if (eWallet) {
      initEthEWallet({ eWallet }).then((res) => {
        setEthEWallet(res);
      });
    }
  }, [eWallet, setEthEWallet]);

  const handleClickEthOffchainSign = async () => {
    if (ethEWallet === null) {
      console.error("EthEWallet is not initialized");
      return;
    }

    try {
      setIsLoading(true);

      const signature = await ethEWallet.sign("hello world!");
      console.log("signature", signature);
    } catch (error) {
      console.error("Failed to sign:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SignWidget
      chain="Ethereum"
      chainIcon={<EthereumIcon />}
      signType="offchain"
      isLoading={isLoading}
      signButtonOnClick={handleClickEthOffchainSign}
    />
  );
};
