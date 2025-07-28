import React, { useCallback, useEffect, useState } from "react";
import { initEthEWallet } from "@keplr-ewallet/ewallet-sdk-eth";
import type { EthEWallet } from "@keplr-ewallet/ewallet-sdk-eth";

import styles from "./eth_sign_widget.module.scss";
import { Widget } from "./widget_components";
import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";

export const EthSignWidget: React.FC<EthSignWidgetProps> = () => {
  const { eWallet, isInitialized } = useKeplrEwallet();
  const [ethEWallet, setEthEWallet] = useState<EthEWallet | null>(null);

  useEffect(() => {
    if (isInitialized && eWallet) {
      initEthEWallet({ eWallet }).then((ethEWallet) => {
        setEthEWallet(ethEWallet);
      });
    }
  }, [isInitialized, eWallet]);

  const handleClickEthSign = useCallback(async () => {
    if (ethEWallet) {
      // @TODO
      // 1. get accounts
      // const provider = ethEWallet.getEthereumProvider();
      // provider.request({ method: 'get_accounts '});

      // @TODO
      // 2. sign
      const sig = await ethEWallet.sign("power");
      console.log("eth sig", sig);
    }
  }, [ethEWallet]);

  if (!ethEWallet) {
    return null;
  }

  return (
    <Widget>
      <button
        className={styles.getPublicKey}
        type="button"
        onClick={handleClickEthSign}
      >
        eth sign
      </button>
    </Widget>
  );
};

export interface EthSignWidgetProps { }
