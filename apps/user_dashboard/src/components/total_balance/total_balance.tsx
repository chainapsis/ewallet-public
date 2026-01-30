"use client";

import { PricePretty } from "@keplr-wallet/unit";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./total_balance.module.scss";
import { DepositModal } from "@oko-wallet-user-dashboard/components/deposit_modal/deposit_modal";
import { useTotalBalance } from "@oko-wallet-user-dashboard/hooks/queries";

export const TotalBalance: FC = () => {
  const { totalUsd, isLoading } = useTotalBalance();

  const formattedTotal = new PricePretty(
    { currency: "usd", symbol: "$", maxDecimals: 2, locale: "en-US" },
    totalUsd,
  ).toString();

  return (
    <div className={styles.container}>
      <Typography tagType="h1" size="xl" weight="semibold" color="primary">
        Total Balance
      </Typography>

      <Typography size="display-xs" weight="semibold" color="primary">
        {isLoading ? "..." : formattedTotal}
      </Typography>

      <DepositModal
        renderTrigger={({ onOpen }) => (
          <Button
            variant="primary"
            size="md"
            fullWidth={false}
            onClick={onOpen}
          >
            Deposit
          </Button>
        )}
      />
    </div>
  );
};
