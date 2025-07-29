"use client";

import { useAppState } from "@/state";
import { initCosmosEWallet } from "@keplr-ewallet/ewallet-sdk-cosmos";
import React, { useEffect, useState, type PropsWithChildren } from "react";

export const KeplrEWalletProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const appState = useAppState.getState();

  useEffect(() => {
    async function fn() {
      try {
        const isCosmosReady = await appState.initKeplrSdkCosmos();

        if (!isCosmosReady) {
          console.error("something wrong");
        }

        // const isEthReady = await appState.initKeplrSdkEth();
        //
        // if (!isCosmosReady) {
        //   console.error("something wrong");
        // }

        setIsInitialized(true);
      } catch (err: any) {
        console.error(err);
      }
    }

    fn().then();
  }, [setIsInitialized, appState]);

  return (
    <div>
      <p>checking {isInitialized ? "true" : "false"}</p>
      {isInitialized && children}
    </div>
  );
};
