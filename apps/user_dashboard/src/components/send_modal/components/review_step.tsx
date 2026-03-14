"use client";

import { PricePretty } from "@keplr-wallet/unit";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { EmptyStateIcon } from "@oko-wallet/oko-common-ui/icons/empty_state_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "../send_modal.module.scss";
import type { Currency } from "@oko-wallet-user-dashboard/types/chain";
import type { TokenBalance } from "@oko-wallet-user-dashboard/types/token";
import { calculateUsdValue } from "@oko-wallet-user-dashboard/utils/format_token_amount";
import { humanToRawAmount } from "@oko-wallet-user-dashboard/utils/send";

interface ReviewStepProps {
  tokenBalance: TokenBalance;
  recipientAddress: string;
  senderAddress: string;
  amount: string;
  fee: string | null;
  feeCurrency: Currency | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

function truncateAddress(address: string): string {
  if (address.length <= 16) {
    return address;
  }
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

export const ReviewStep: FC<ReviewStepProps> = ({
  tokenBalance,
  recipientAddress,
  senderAddress,
  amount,
  fee,
  feeCurrency,
  isSubmitting,
  onConfirm,
  onBack,
}) => {
  const currency = tokenBalance.token.currency;
  const priceUsd = tokenBalance.priceUsd;
  const rawAmount = humanToRawAmount(amount, currency.coinDecimals);
  const amountUsd = priceUsd
    ? calculateUsdValue(rawAmount, currency.coinDecimals, priceUsd)
    : undefined;

  return (
    <>
      {/* Amount Display */}
      <div className={styles.reviewAmountLarge}>
        {currency.coinImageUrl ? (
          <img
            src={currency.coinImageUrl}
            alt={currency.coinDenom}
            className={styles.tokenImage}
          />
        ) : (
          <EmptyStateIcon size={32} />
        )}
        <Typography size="display-xs" weight="semibold" color="primary">
          {amount} {currency.coinDenom}
        </Typography>
        {amountUsd !== undefined && (
          <Typography size="sm" color="tertiary">
            ~
            {new PricePretty(
              {
                currency: "usd",
                symbol: "$",
                maxDecimals: 2,
                locale: "en-US",
              },
              amountUsd,
            ).toString()}
          </Typography>
        )}
      </div>

      {/* Details */}
      <div className={styles.reviewSection}>
        <div className={styles.reviewRow}>
          <span className={styles.reviewLabel}>Chain</span>
          <Typography size="sm" weight="medium" color="primary">
            {tokenBalance.chainInfo.chainName}
          </Typography>
        </div>

        <div className={styles.reviewDivider} />

        <div className={styles.reviewRow}>
          <span className={styles.reviewLabel}>From</span>
          <div className={styles.reviewValue}>
            <Typography size="sm" weight="medium" color="primary">
              {truncateAddress(senderAddress)}
            </Typography>
          </div>
        </div>

        <div className={styles.reviewDivider} />

        <div className={styles.reviewRow}>
          <span className={styles.reviewLabel}>To</span>
          <div className={styles.reviewValue}>
            <Typography size="sm" weight="medium" color="primary">
              {truncateAddress(recipientAddress)}
            </Typography>
          </div>
        </div>

        <div className={styles.reviewDivider} />

        <div className={styles.reviewRow}>
          <span className={styles.reviewLabel}>Estimated Fee</span>
          <Typography size="sm" weight="medium" color="primary">
            {fee && feeCurrency ? `${fee} ${feeCurrency.coinDenom}` : "--"}
          </Typography>
        </div>
      </div>

      {/* Buttons */}
      <div className={styles.buttonGroup}>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={onConfirm}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Confirm Send
        </Button>
      </div>
    </>
  );
};
