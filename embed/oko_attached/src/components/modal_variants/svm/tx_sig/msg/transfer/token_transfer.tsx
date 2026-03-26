import { CopyOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/copy_outlined";
import { EmptyStateIcon } from "@oko-wallet/oko-common-ui/icons/empty_state_icon";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "../instructions.module.scss";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { TxRow } from "@oko-wallet-attached/components/modal_variants/common/tx_row";
import { useMobileMode } from "@oko-wallet-attached/hooks/mobile_mode";
import { useGetSvmTokenMetadata } from "@oko-wallet-attached/web3/svm/queries";

function formatTokenAmount(amount: bigint | number, decimals: number): string {
  if (decimals === 0) {
    return amount.toLocaleString();
  }

  // Use scientific notation to avoid floating-point precision issues
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  // Convert to scientific notation string: "123456E-6" for amount=123456, decimals=6
  return formatter.format(`${amount}E-${decimals}` as unknown as number);
}

export interface TokenTransferPrettyProps {
  amount: bigint | number;
  decimals?: number;
  mint?: string;
  to?: string;
  chainId: string;
  embedded?: boolean;
}

export const TokenTransferPretty: FC<TokenTransferPrettyProps> = ({
  amount,
  decimals: providedDecimals,
  mint,
  to,
  chainId,
  embedded = false,
}) => {
  const isMobile = useMobileMode();
  const { data: tokenMetadata, isLoading } = useGetSvmTokenMetadata({
    mintAddress: mint,
    chainId,
  });
  const embeddedTransferRowClassName = embedded
    ? styles.embeddedTransferRow
    : undefined;

  const decimals = tokenMetadata?.decimals ?? providedDecimals ?? 0;
  const symbol = tokenMetadata?.symbol;
  const name = tokenMetadata?.name;
  const icon = tokenMetadata?.icon;
  const hasMetadata = !!symbol;

  const formattedAmount = formatTokenAmount(amount, decimals);

  return (
    <div className={styles.container}>
      <TxRow label="Send" className={embeddedTransferRowClassName}>
        <div className={styles.tokenInfo}>
          {isLoading ? (
            <Skeleton width={24} height={24} borderRadius="50%" />
          ) : hasMetadata ? (
            <Avatar
              src={icon}
              alt={symbol}
              size={isMobile ? "md" : "sm"}
              variant="rounded"
              fallback={symbol.slice(0, 2)}
            />
          ) : (
            <EmptyStateIcon size={isMobile ? 24 : 16} />
          )}
          {isLoading ? (
            <Skeleton width={80} height={20} />
          ) : hasMetadata ? (
            <Typography
              color="secondary"
              size="lg"
              weight="semibold"
              className={styles.tokenAmount}
            >
              {`${formattedAmount} ${symbol}`}
            </Typography>
          ) : mint ? (
            <Typography
              color="secondary"
              size="lg"
              weight="semibold"
              className={styles.tokenAmount}
            >
              {`${formattedAmount} Unknown Token`}
            </Typography>
          ) : (
            <Typography
              color="secondary"
              size="lg"
              weight="semibold"
              className={styles.tokenAmount}
            >
              {formattedAmount}
            </Typography>
          )}
        </div>
      </TxRow>
      {!hasMetadata && mint && (
        <div className={styles.tokenAddressSection}>
          <Typography
            color="tertiary"
            size="xs"
            weight="medium"
            className={styles.tokenAddressLabel}
          >
            Token Address
          </Typography>
          <button
            type="button"
            className={styles.tokenAddressRow}
            onClick={() => navigator.clipboard.writeText(mint)}
          >
            <Typography
              size={isMobile ? "md" : "sm"}
              weight="medium"
              className={styles.address}
            >
              {mint}
            </Typography>
            <CopyOutlinedIcon size={16} color="currentColor" />
          </button>
        </div>
      )}
      {hasMetadata && name && (
        <TxRow label="Token" className={embeddedTransferRowClassName}>
          <Typography
            color="secondary"
            size={isMobile ? "md" : "sm"}
            weight="medium"
            className={styles.address}
          >
            {name}
          </Typography>
        </TxRow>
      )}
      {to && (
        <TxRow label="to" className={embeddedTransferRowClassName}>
          <Typography
            color="secondary"
            size={isMobile ? "md" : "sm"}
            weight="medium"
            className={styles.address}
          >
            {to}
          </Typography>
        </TxRow>
      )}
    </div>
  );
};
