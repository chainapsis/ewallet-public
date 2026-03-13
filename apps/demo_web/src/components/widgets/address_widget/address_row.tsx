import { Tooltip } from "@oko-wallet/oko-common-ui/tooltip";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC, ReactElement } from "react";

import styles from "./address_row.module.scss";

const chainConfig: Record<
  AddressRowProps["chain"],
  { label: string; prefix: string }
> = {
  ethereum: { label: "Ethereum", prefix: "0x" },
  cosmos: { label: "Cosmos Hub", prefix: "cosmos1" },
  solana: { label: "Solana", prefix: "7Zk9LQp" },
};

export const AddressRow: FC<AddressRowProps> = ({ icon, chain, address }) => {
  const isLoggedIn = !!address;
  const { label, prefix } = chainConfig[chain];

  const renderChainLabel = () => (
    <div className={isLoggedIn ? styles.chainLabelChip : styles.chainLabel}>
      {icon}
      <Typography tagType="span" size="md" weight="semibold" color="secondary">
        {label}
      </Typography>
    </div>
  );

  const renderAddressContent = () => {
    if (isLoggedIn) {
      return (
        <Typography
          tagType="span"
          size="sm"
          weight="medium"
          className={styles.address}
        >
          {address}
        </Typography>
      );
    }

    return (
      <Tooltip title="Login to see details" placement="bottom">
        <div className={styles.placeholderContent}>
          <Typography
            tagType="span"
            size="md"
            weight="medium"
            className={styles.placeholderPrefix}
          >
            {prefix}
          </Typography>
          {Array.from({ length: 7 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: display-only list
            <div key={i} className={styles.dot} />
          ))}
        </div>
      </Tooltip>
    );
  };

  return (
    <div
      className={`${styles.container} ${isLoggedIn ? styles.loggedIn : styles.loggedOut}`}
    >
      {renderChainLabel()}
      <div className={styles.addressContent}>{renderAddressContent()}</div>
    </div>
  );
};

export interface AddressRowProps {
  icon: ReactElement;
  chain: "ethereum" | "cosmos" | "solana";
  address?: string;
}
