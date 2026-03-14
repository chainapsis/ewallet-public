"use client";

import { PricePretty } from "@keplr-wallet/unit";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { EmptyStateIcon } from "@oko-wallet/oko-common-ui/icons/empty_state_icon";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useCallback, useMemo, useState } from "react";

import styles from "../send_modal.module.scss";
import { getTokenType } from "../types";
import { useAddressValidation } from "@oko-wallet-user-dashboard/hooks/use_address_validation";
import type { TokenBalance } from "@oko-wallet-user-dashboard/types/token";
import {
  calculateUsdValue,
  formatDisplayBalance,
} from "@oko-wallet-user-dashboard/utils/format_token_amount";
import {
  humanToRawAmount,
  isAmountValid,
  rawToHumanAmount,
} from "@oko-wallet-user-dashboard/utils/send";

interface EnterDetailsStepProps {
  tokenBalance: TokenBalance;
  senderAddress: string | undefined;
  recipientAddress: string;
  amount: string;
  onRecipientChange: (address: string) => void;
  onAmountChange: (amount: string, amountRaw: string) => void;
  onContinue: () => void;
  feeRaw: string | null;
  feeCurrency: { coinDenom: string; coinDecimals: number } | null;
  fee: string | null;
  isFeeLoading: boolean;
}

export const EnterDetailsStep: FC<EnterDetailsStepProps> = ({
  tokenBalance,
  senderAddress,
  recipientAddress,
  amount,
  onRecipientChange,
  onAmountChange,
  onContinue,
  feeRaw,
  feeCurrency,
  fee,
  isFeeLoading,
}) => {
  const currency = tokenBalance.token.currency;
  const chainInfo = tokenBalance.chainInfo;
  const [addressTouched, setAddressTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  const { validate } = useAddressValidation(chainInfo, senderAddress);
  const addressValidation = useMemo(
    () => validate(recipientAddress),
    [validate, recipientAddress],
  );

  const amountValid = useMemo(
    () =>
      isAmountValid(amount, tokenBalance.token.amount, currency.coinDecimals),
    [amount, tokenBalance.token.amount, currency.coinDecimals],
  );

  const priceUsd = tokenBalance.priceUsd;
  const amountUsd = useMemo(() => {
    if (!priceUsd || !amount) {
      return undefined;
    }
    const rawAmount = humanToRawAmount(amount, currency.coinDecimals);
    if (rawAmount === "0") {
      return undefined;
    }
    return calculateUsdValue(rawAmount, currency.coinDecimals, priceUsd);
  }, [priceUsd, amount, currency.coinDecimals]);

  const handleMaxClick = useCallback(() => {
    const tokenType = getTokenType(currency, chainInfo);
    let maxRaw = tokenBalance.token.amount;

    // For native tokens, subtract fee from max
    if (tokenType === "native" && feeRaw && feeCurrency) {
      const isFeeSameDenom = feeCurrency.coinDenom === currency.coinDenom;
      if (isFeeSameDenom) {
        const balance = BigInt(maxRaw);
        const feeAmount = BigInt(feeRaw);
        const adjusted = balance > feeAmount ? balance - feeAmount : BigInt(0);
        maxRaw = adjusted.toString();
      }
    }

    const humanAmount = rawToHumanAmount(maxRaw, currency.coinDecimals);
    onAmountChange(humanAmount, maxRaw);
    setAmountTouched(true);
  }, [tokenBalance, currency, chainInfo, feeRaw, feeCurrency, onAmountChange]);

  const handleAmountChange = useCallback(
    (value: string) => {
      // Allow empty or valid decimal input
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        const raw = humanToRawAmount(value || "0", currency.coinDecimals);
        onAmountChange(value, raw);
        setAmountTouched(true);
      }
    },
    [currency.coinDecimals, onAmountChange],
  );

  const canContinue = addressValidation.valid && amountValid && !!amount;

  return (
    <>
      {/* Selected Token Info */}
      <div className={styles.selectedTokenInfo}>
        {currency.coinImageUrl ? (
          <img
            src={currency.coinImageUrl}
            alt={currency.coinDenom}
            className={styles.tokenImage}
          />
        ) : (
          <EmptyStateIcon size={28} />
        )}
        <div className={styles.selectedTokenDetails}>
          <Typography size="sm" weight="semibold" color="primary">
            {currency.coinDenom}
          </Typography>
          <Typography size="xs" color="tertiary">
            {chainInfo.chainName} &middot; Balance:{" "}
            {formatDisplayBalance(tokenBalance.token.amount, currency)}
          </Typography>
        </div>
      </div>

      {/* Recipient Address */}
      <div className={styles.inputGroup}>
        <Typography size="xs" weight="semibold" color="secondary">
          Recipient Address
        </Typography>
        <div
          className={`${styles.inputWrapper} ${
            addressTouched && recipientAddress && !addressValidation.valid
              ? styles.error
              : ""
          }`}
        >
          <input
            type="text"
            className={styles.textInput}
            placeholder="Enter recipient address"
            value={recipientAddress}
            onChange={(e) => {
              onRecipientChange(e.target.value);
              setAddressTouched(true);
            }}
            name="recipient-address"
          />
        </div>
        {addressTouched && addressValidation.error && (
          <span className={styles.errorText}>{addressValidation.error}</span>
        )}
      </div>

      {/* Amount */}
      <div className={styles.inputGroup}>
        <Typography size="xs" weight="semibold" color="secondary">
          Amount
        </Typography>
        <div
          className={`${styles.inputWrapper} ${
            amountTouched && amount && !amountValid ? styles.error : ""
          }`}
        >
          <input
            type="text"
            inputMode="decimal"
            className={styles.textInput}
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            name="send-amount"
          />
          <button
            type="button"
            className={styles.maxButton}
            onClick={handleMaxClick}
          >
            MAX
          </button>
        </div>
        {amountTouched && amount && !amountValid && (
          <span className={styles.errorText}>
            Invalid amount or exceeds balance
          </span>
        )}
        {amountUsd !== undefined && (
          <span className={styles.usdValue}>
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
          </span>
        )}
      </div>

      {/* Fee Display */}
      <div className={styles.feeDisplay}>
        <Typography size="xs" color="tertiary">
          Estimated Fee
        </Typography>
        {isFeeLoading ? (
          <Skeleton width={80} height={14} />
        ) : fee && feeCurrency ? (
          <Typography size="xs" weight="medium" color="secondary">
            {fee} {feeCurrency.coinDenom}
          </Typography>
        ) : (
          <Typography size="xs" color="quaternary">
            --
          </Typography>
        )}
      </div>

      <Button
        variant="primary"
        size="md"
        fullWidth
        onClick={onContinue}
        disabled={!canContinue}
      >
        Continue
      </Button>
    </>
  );
};
