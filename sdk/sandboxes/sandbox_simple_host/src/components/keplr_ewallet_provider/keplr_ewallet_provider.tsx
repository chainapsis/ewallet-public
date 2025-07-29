"use client";

import { initCosmosEWallet } from "@keplr-ewallet/ewallet-sdk-cosmos";
import React, { useEffect, type PropsWithChildren } from "react";

export const KeplrEWalletProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  useEffect(() => {
    async function fn() {
      // const cosmos = initCosmosEWallet({});
    }

    fn().then();
  }, []);

  return (
    <div>
      <p>check</p>
      {children}
    </div>
  );
};
