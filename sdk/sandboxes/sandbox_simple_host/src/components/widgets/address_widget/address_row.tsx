import React, { type ReactElement } from "react";
// import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import styles from "./address_row.module.scss";

export const AddressRow: React.FC<AddressRowProps> = ({
  icon,
  chain,
  address,
}) => {
  const isLoggedIn = !!address;

  const label = chain === "ethereum" ? "Ethereum" : "Cosmos Hub";
  const prefix = chain === "ethereum" ? "0x" : "cosmos1";

  return (
    <div className={styles.container}>
      {icon}
      <p>{label}</p>

      <div className={styles.valueContainer}>
        {isLoggedIn ? (
          <p>{address}</p>
        ) : (
          <>
            <p>{prefix}</p>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.dot} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export interface AddressRowProps {
  icon: ReactElement;
  chain: "ethereum" | "cosmos";
  address?: string;
}
