"use client";

import { CoinPretty, Dec, Int, PricePretty } from "@keplr-wallet/unit";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { Card } from "@oko-wallet/oko-common-ui/card";
import { EmptyStateIcon } from "@oko-wallet/oko-common-ui/icons/empty_state_icon";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Input } from "@oko-wallet/oko-common-ui/input";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./send_modal.module.scss";
import { displayToast } from "@oko-wallet-user-dashboard/components/toast";
import { useSendCosmos } from "@oko-wallet-user-dashboard/hooks/mutations/use_send_cosmos";
import type { TokenBalance } from "@oko-wallet-user-dashboard/types/token";
import { formatDisplayBalance } from "@oko-wallet-user-dashboard/utils/format_token_amount";
import { validateCosmosRecipient } from "@oko-wallet-user-dashboard/utils/validate_recipient";

const MEMO_BYTE_LIMIT = 256;

interface SendModalProps {
  tokenBalance: TokenBalance;
  senderAddress: string;
  renderTrigger: (props: { onOpen: () => void }) => ReactNode;
}

function displayToBaseDenom(displayAmount: string, decimals: number): string {
  if (!displayAmount) {
    return "0";
  }
  const amount = new Dec(displayAmount);
  const multiplier = new Dec(10).pow(new Int(decimals));
  return amount.mul(multiplier).truncate().toString();
}

function safeDec(value: string): Dec | undefined {
  try {
    return new Dec(value);
  } catch {
    return undefined;
  }
}

export const SendModal: FC<SendModalProps> = ({
  tokenBalance,
  senderAddress,
  renderTrigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [memo, setMemo] = useState("");
  const [submissionError, setSubmissionError] = useState<string | undefined>();

  const cosmosChain = tokenBalance.chainInfo.cosmos;
  const currency = tokenBalance.token.currency;
  const bech32Prefix = cosmosChain?.bech32Config?.bech32PrefixAccAddr;

  const sendMutation = useSendCosmos();

  const resetForm = useCallback(() => {
    setRecipient("");
    setAmountInput("");
    setMemo("");
    setSubmissionError(undefined);
    sendMutation.reset();
  }, [sendMutation]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const onOpen = () => setIsOpen(true);
  const onClose = () => {
    if (sendMutation.isPending) {
      return;
    }
    setIsOpen(false);
  };

  const recipientError = useMemo(() => {
    if (!recipient.trim() || !bech32Prefix) {
      return undefined;
    }
    return validateCosmosRecipient(recipient, bech32Prefix);
  }, [recipient, bech32Prefix]);

  const amountDec = useMemo(() => safeDec(amountInput), [amountInput]);
  const balanceDec = useMemo(
    () => new CoinPretty(currency, new Dec(tokenBalance.token.amount)).toDec(),
    [currency, tokenBalance.token.amount],
  );

  const amountError = useMemo(() => {
    if (!amountInput.trim()) {
      return undefined;
    }
    if (!amountDec) {
      return "Invalid amount";
    }
    if (amountDec.lte(new Dec(0))) {
      return "Amount must be greater than zero";
    }
    if (amountDec.gt(balanceDec)) {
      return "Exceeds available balance";
    }
    return undefined;
  }, [amountInput, amountDec, balanceDec]);

  const memoBytes = new TextEncoder().encode(memo).length;
  const memoError =
    memoBytes > MEMO_BYTE_LIMIT
      ? `Memo exceeds ${MEMO_BYTE_LIMIT} bytes`
      : undefined;

  const canSubmit =
    !!cosmosChain &&
    !!bech32Prefix &&
    !!recipient.trim() &&
    !recipientError &&
    !!amountInput.trim() &&
    !amountError &&
    !memoError &&
    !sendMutation.isPending;

  const handleMax = () => {
    const display = new CoinPretty(currency, new Dec(tokenBalance.token.amount))
      .maxDecimals(currency.coinDecimals)
      .trim(true)
      .hideDenom(true)
      .toString();
    setAmountInput(display);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !cosmosChain || !amountDec) {
      return;
    }

    setSubmissionError(undefined);

    const baseAmount = displayToBaseDenom(amountInput, currency.coinDecimals);

    try {
      const result = await sendMutation.mutateAsync({
        chain: cosmosChain,
        recipient: recipient.trim(),
        amount: baseAmount,
        denom: currency.coinMinimalDenom,
        memo: memo.trim(),
      });

      displayToast({
        variant: "success",
        title: "Transaction sent",
        description: `Tx hash: ${result.txHash.slice(0, 10)}…`,
      });
      setIsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSubmissionError(message);
      displayToast({
        variant: "error",
        title: "Failed to send",
        description: message,
      });
    }
  };

  const usdValue = useMemo(() => {
    if (!amountDec || !tokenBalance.priceUsd) {
      return undefined;
    }
    const value = amountDec.mul(new Dec(tokenBalance.priceUsd));
    return new PricePretty(
      { currency: "usd", symbol: "$", maxDecimals: 2, locale: "en-US" },
      value,
    ).toString();
  }, [amountDec, tokenBalance.priceUsd]);

  if (!cosmosChain || !bech32Prefix) {
    return <>{renderTrigger({ onOpen })}</>;
  }

  return (
    <>
      {renderTrigger({ onOpen })}

      {isOpen && (
        <div className={styles.modalBackground} onClick={onClose}>
          <div
            className={styles.modal}
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <Card
              className={styles.modalCard}
              variant="elevated"
              padding="none"
            >
              <div className={styles.header}>
                <Typography size="md" weight="semibold" color="primary">
                  Send {currency.coinDenom}
                </Typography>
                <button
                  className={styles.closeButton}
                  onClick={onClose}
                  aria-label="Close modal"
                  type="button"
                >
                  <XCloseIcon color="var(--fg-quaternary)" size={20} />
                </button>
              </div>

              <div className={styles.tokenRow}>
                {currency.coinImageUrl ? (
                  <img
                    src={currency.coinImageUrl}
                    className={styles.tokenImage}
                    alt={currency.coinDenom}
                  />
                ) : (
                  <EmptyStateIcon size={32} />
                )}
                <div className={styles.tokenMeta}>
                  <Typography size="sm" weight="medium" color="secondary">
                    {tokenBalance.chainInfo.chainName}
                  </Typography>
                  <Typography size="xs" color="tertiary">
                    From: {senderAddress.slice(0, 10)}…{senderAddress.slice(-6)}
                  </Typography>
                </div>
                <div className={styles.availableWrapper}>
                  <Typography size="xs" color="tertiary">
                    Available
                  </Typography>
                  <Typography size="sm" weight="medium" color="secondary">
                    {formatDisplayBalance(tokenBalance.token.amount, currency)}{" "}
                    {currency.coinDenom}
                  </Typography>
                </div>
              </div>

              <Spacing height={16} />

              <Input
                name="recipient"
                label="To"
                requiredSymbol
                fullWidth
                placeholder={`${bech32Prefix}1...`}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                error={recipientError}
              />

              <Spacing height={12} />

              <Input
                name="amount"
                label="Amount"
                requiredSymbol
                fullWidth
                inputMode="decimal"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                error={amountError}
                helpText={usdValue}
                SideComponent={
                  <button
                    type="button"
                    className={styles.maxButton}
                    onClick={handleMax}
                  >
                    Max
                  </button>
                }
              />

              <Spacing height={12} />

              <Input
                name="memo"
                label="Memo (optional)"
                fullWidth
                placeholder="Optional memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                error={memoError}
              />

              {submissionError && (
                <>
                  <Spacing height={8} />
                  <Typography size="sm" color="error-primary">
                    {submissionError}
                  </Typography>
                </>
              )}

              <Spacing height={20} />

              <div className={styles.footer}>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={onClose}
                  disabled={sendMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  isLoading={sendMutation.isPending}
                >
                  Send
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};
