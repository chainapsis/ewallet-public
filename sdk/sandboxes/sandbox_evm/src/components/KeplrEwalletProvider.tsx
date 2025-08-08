"use client";

import React, { useEffect, useState, type PropsWithChildren } from "react";

import { useAppState } from "@keplr-ewallet-sandbox-evm/services/store/app";

export const EWalletProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const appState = useAppState.getState();

  useEffect(() => {
    async function fn() {
      console.log("initKeplrSdkEth");

      try {
        const isEthReady = await appState.initKeplrSdkEth();

        if (!isEthReady) {
          console.error("something wrong");
        }

        if (isEthReady) {
          setIsInitialized(true);
        }
      } catch (err: any) {
        console.error(err);
      }
    }

    fn().then();
  }, [appState]);

  return <React.Fragment>{isInitialized && children}</React.Fragment>;
};
