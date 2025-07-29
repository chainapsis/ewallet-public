"use client";

import { initCosmosEWallet } from "@keplr-ewallet/ewallet-sdk-cosmos";
import React, { useEffect, useState, type PropsWithChildren } from "react";

export const KeplrEWalletProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    async function fn() {
      try {
        const cosmos = initCosmosEWallet({
          customerId: "afb0afd1-d66d-4531-981c-cbf3fb1507b9", // from seed data
        });

        console.log(1, cosmos);

        setIsInitializing(true);
      } catch (err: any) {
        console.error(err);
      }
    }

    fn().then();
  }, [setIsInitializing]);

  return (
    <div>
      <p>checking {isInitializing}</p>
      {children}
    </div>
  );
};
