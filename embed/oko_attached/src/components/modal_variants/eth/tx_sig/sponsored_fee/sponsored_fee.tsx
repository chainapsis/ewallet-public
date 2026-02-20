import type { FC } from "react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { InfoCircleIcon } from "@oko-wallet/oko-common-ui/icons/info_circle";
import { WarningIcon } from "@oko-wallet/oko-common-ui/icons/warning_icon";
import cn from "classnames";

import type { SponsoredFeeInfo } from "./types";
import { getSponsoredFeeVariant } from "./types";
import styles from "./sponsored_fee.module.scss";
import { SponsoredFeeTooltip } from "./sponsored_fee_tooltip";

/**
 * Format ETH fee to a reasonable number of decimal places
 * e.g., "0.000000847450914136 ETH" -> "0.00000085 ETH"
 */
function formatFeeDisplay(fee: string): string {
  // Extract number and symbol (e.g., "0.000123 ETH" -> ["0.000123", "ETH"])
  const match = fee.match(/^([\d.]+)\s*(.*)$/);
  if (!match) return fee;

  const [, numStr, symbol] = match;
  const num = parseFloat(numStr);

  if (isNaN(num)) return fee;

  // Format to max 8 significant decimal places for small numbers
  let formatted: string;
  if (num === 0) {
    formatted = "0";
  } else if (num < 0.00000001) {
    formatted = num.toExponential(2);
  } else if (num < 0.0001) {
    // For very small numbers, show up to 8 decimal places
    formatted = num.toFixed(8).replace(/\.?0+$/, "");
  } else if (num < 1) {
    // For small numbers, show up to 6 decimal places
    formatted = num.toFixed(6).replace(/\.?0+$/, "");
  } else {
    // For larger numbers, show up to 4 decimal places
    formatted = num.toFixed(4).replace(/\.?0+$/, "");
  }

  return symbol ? `${formatted} ${symbol}` : formatted;
}

export interface SponsoredFeeProps {
  info: SponsoredFeeInfo;
  isSimulating?: boolean;
  showTooltip?: boolean;
  onTooltipToggle?: () => void;
  tooltipVisible?: boolean;
}

export const SponsoredFee: FC<SponsoredFeeProps> = ({
  info,
  isSimulating = false,
  showTooltip = false,
  onTooltipToggle,
  tooltipVisible = false,
}) => {
  const variant = getSponsoredFeeVariant(info.state);
  const isError = variant === "error";
  const isTimer = variant === "timer";
  const isLoading = variant === "loading";

  return (
    <div className={cn(styles.container, { [styles.error]: isError })}>
      {/* Fee line */}
      <div className={styles.line}>
        <div className={styles.left}>
          <Typography color="tertiary" size="xs" weight="medium">
            Fee (Covered by Oko)
          </Typography>
        </div>
        <div className={styles.right}>
          {isSimulating ? (
            <Skeleton width="80px" className="skeleton--text-xs" />
          ) : (
            <>
              <Typography
                color="tertiary"
                size="xs"
                weight="medium"
                className={styles.strikethrough}
              >
                {formatFeeDisplay(info.originalFee)}
              </Typography>
              <div
                className={cn(styles.badge, { [styles.badgeError]: isError })}
              >
                <Typography
                  color={isError ? "tertiary" : "brand-secondary"}
                  size="xs"
                  weight="medium"
                  className={isError ? undefined : styles.badgeText}
                >
                  Free
                </Typography>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Next free transaction line - hide during/after signing */}
      {info.state !== "success" && (
        <div className={styles.line}>
          <div className={styles.left}>
            <Typography color="tertiary" size="xs" weight="medium">
              Next free transaction in
            </Typography>
            <div
              className={styles.infoIcon}
              onClick={onTooltipToggle}
              role="button"
              tabIndex={0}
            >
              <InfoCircleIcon size={16} color="var(--fg-quaternary)" />
              {tooltipVisible && showTooltip && <SponsoredFeeTooltip />}
            </div>
          </div>
          <div className={styles.right}>
            {isSimulating || isLoading ? (
              <Skeleton width="40px" className="skeleton--text-xs" />
            ) : isTimer ? (
              <Typography color="tertiary" size="xs" weight="medium">
                {info.formattedRemainingTime}
              </Typography>
            ) : (
              <Typography color="tertiary" size="xs" weight="medium">
                5 min
              </Typography>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {isError && info.errorMessage && (
        <div className={styles.errorMessage}>
          <WarningIcon size={16} color="var(--fg-warning-primary)" />
          <Typography color="warning-primary" size="xs" weight="medium">
            {info.errorMessage}
          </Typography>
        </div>
      )}

      {/* Loading message */}
      {(isLoading || info.state === "success") && (
        <div className={styles.loadingMessage}>
          <Typography color="tertiary" size="xs" weight="medium">
            Keep this window open during the transaction...
          </Typography>
        </div>
      )}
    </div>
  );
};
