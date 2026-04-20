"use client";

import { PricePretty } from "@keplr-wallet/unit";
import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { IconTransition } from "@oko-wallet/oko-common-ui/icon_transition";
import { AlertTriangleIcon } from "@oko-wallet/oko-common-ui/icons/alert_triangle_icon";
import { ArrowUpRightIcon } from "@oko-wallet/oko-common-ui/icons/arrow_up_right";
import { CheckThinIcon } from "@oko-wallet/oko-common-ui/icons/check_thin_icon";
import { CopyOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/copy_outlined";
import { EmptyStateIcon } from "@oko-wallet/oko-common-ui/icons/empty_state_icon";
import { QrCodeIcon } from "@oko-wallet/oko-common-ui/icons/qr_code_icon";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Tooltip } from "@oko-wallet/oko-common-ui/tooltip";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import type { FC, MouseEvent } from "react";

import styles from "./token_item.module.scss";
import { AddressQrModal } from "@oko-wallet-user-dashboard/components/address_qr_modal/address_qr_modal";
import { SendModal } from "@oko-wallet-user-dashboard/components/send_modal/send_modal";
import { useCopyToClipboard } from "@oko-wallet-user-dashboard/hooks/use_copy_to_clipboard";
import type { TokenBalance } from "@oko-wallet-user-dashboard/types/token";
import {
  calculateUsdValue,
  formatDisplayBalance,
} from "@oko-wallet-user-dashboard/utils/format_token_amount";

interface TokenItemProps {
  tokenBalance: TokenBalance;
  address?: string;
  onClick?: () => void;
  disabled?: boolean;
  isNotReady?: boolean;
}

export const TokenItem: FC<TokenItemProps> = ({
  tokenBalance,
  address,
  onClick,
  disabled,
  isNotReady,
}) => {
  const { isCopied, copy } = useCopyToClipboard();

  const currency = tokenBalance.token.currency;
  const imageUrl = currency.coinImageUrl;
  const coinDenom = currency.coinDenom;

  // Calculate price
  const priceUsd = tokenBalance.priceUsd;
  const valueUsd = priceUsd
    ? calculateUsdValue(
        tokenBalance.token.amount,
        currency.coinDecimals,
        priceUsd,
      )
    : undefined;

  const isIBC = currency.coinMinimalDenom.startsWith("ibc/");
  const isCW20 = currency.coinMinimalDenom.startsWith("cw20:");
  const canSend =
    !!tokenBalance.chainInfo.cosmos &&
    !!address &&
    !isCW20 &&
    !isNotReady &&
    !tokenBalance.error;

  const handleCopyAddress = (e: MouseEvent) => {
    e.stopPropagation();
    if (address) {
      copy(address);
    }
  };

  const handleClick = () => {
    if (disabled || !onClick) {
      return;
    }
    onClick();
  };

  return (
    <div
      className={cn(styles.container, {
        [styles.disabled]: disabled,
        [styles.clickable]: onClick,
      })}
      onClick={handleClick}
    >
      <div className={styles.leftSection}>
        {/* Token Image */}
        {isNotReady ? (
          <Skeleton width={28} height={28} borderRadius="50%" />
        ) : imageUrl ? (
          <img src={imageUrl} alt={coinDenom} className={styles.tokenImage} />
        ) : (
          <EmptyStateIcon size={28} />
        )}

        {/* Token Info */}
        <div className={styles.tokenInfo}>
          <div className={styles.tokenNameRow}>
            {tokenBalance.error && !isNotReady ? (
              <Tooltip
                content="NetworkError when attempting to fetch resource"
                placement="bottom"
                className={styles.errorTooltip}
              >
                <AlertTriangleIcon size={16} />
                <Typography size="sm" weight="medium" color="warning-primary">
                  {coinDenom}
                </Typography>
                {isIBC && (
                  <Badge type="pill" size="sm" color="gray" label="IBC" />
                )}
              </Tooltip>
            ) : isNotReady ? (
              <Skeleton width={60} height={16} />
            ) : (
              <>
                <Typography size="sm" weight="medium" color="secondary">
                  {coinDenom}
                </Typography>
                {isIBC && (
                  <Badge type="pill" size="sm" color="gray" label="IBC" />
                )}
              </>
            )}
            {tokenBalance.isFetching && !isNotReady && (
              <div className={styles.loadingIndicator} />
            )}
          </div>
          <div className={styles.chainNameRow}>
            {isNotReady ? (
              <Skeleton width={80} height={14} />
            ) : (
              <Typography size="xs" weight="medium" color="tertiary">
                {tokenBalance.chainInfo.chainName}
              </Typography>
            )}
          </div>
        </div>
      </div>

      <div className={styles.rightSection}>
        {/* Balance & Price */}
        {
          <div className={styles.balanceInfo}>
            {isNotReady ? (
              <>
                <Skeleton width={60} height={16} />
                <Skeleton width={50} height={14} />
              </>
            ) : (
              <>
                <Typography size="sm" weight="medium" color="secondary">
                  {formatDisplayBalance(tokenBalance.token.amount, currency)}
                </Typography>
                <Typography size="xs" weight="medium" color="tertiary">
                  {valueUsd !== undefined
                    ? new PricePretty(
                        {
                          currency: "usd",
                          symbol: "$",
                          maxDecimals: 2,
                          locale: "en-US",
                        },
                        valueUsd,
                      ).toString()
                    : "-"}
                </Typography>
              </>
            )}
          </div>
        }

        {/* Copy Address and QR Code Buttons */}
        {address && !isNotReady && (
          <>
            <button
              className={`${styles.copyButton}`}
              onClick={handleCopyAddress}
              type="button"
            >
              <IconTransition
                isActive={isCopied}
                defaultIcon={
                  <CopyOutlinedIcon size={16} color="var(--fg-tertiary)" />
                }
                activeIcon={
                  <CheckThinIcon size={16} color="var(--fg-tertiary)" />
                }
              />
            </button>

            <AddressQrModal
              renderTrigger={({ onOpen }) => (
                <button
                  type="button"
                  className={`${styles.copyButton}`}
                  onClick={onOpen}
                >
                  <QrCodeIcon size={16} color="var(--fg-tertiary)" />
                </button>
              )}
              chainInfo={tokenBalance.chainInfo}
              address={address}
            />

            {canSend && (
              <SendModal
                tokenBalance={tokenBalance}
                senderAddress={address}
                renderTrigger={({ onOpen }) => (
                  <button
                    type="button"
                    className={styles.copyButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen();
                    }}
                    aria-label="Send token"
                  >
                    <ArrowUpRightIcon size={16} color="var(--fg-tertiary)" />
                  </button>
                )}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
