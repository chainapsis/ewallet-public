import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "../instructions.module.scss";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { TxRow } from "@oko-wallet-attached/components/modal_variants/common/tx_row";
import { SOLANA_LOGO_URL } from "@oko-wallet-attached/constants/urls";
import { useMobileMode } from "@oko-wallet-attached/hooks/mobile_mode";

function formatLamports(lamports: bigint | number): string {
  // Use scientific notation to avoid floating-point precision issues
  // SOL has 9 decimals
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 9,
  });
  return `${formatter.format(`${lamports}E-9` as unknown as number)} SOL`;
}

export interface SvmTransferPrettyProps {
  lamports: bigint | number;
  to?: string;
  embedded?: boolean;
  mobileNativeEmbedded?: boolean;
}

export const SvmTransferPretty: FC<SvmTransferPrettyProps> = ({
  lamports,
  to,
  embedded = false,
  mobileNativeEmbedded = false,
}) => {
  const isMobile = useMobileMode();
  const rowClassName = embedded ? styles.embeddedTransferRow : undefined;
  const amountSize = mobileNativeEmbedded ? "display-xs" : "lg";

  return (
    <div className={styles.container}>
      <TxRow label="Send" className={rowClassName}>
        <div className={styles.tokenInfo}>
          <Avatar
            src={SOLANA_LOGO_URL}
            alt="SOL"
            size={isMobile ? "md" : "sm"}
            variant="rounded"
          />
          <Typography
            color="secondary"
            size={amountSize}
            weight="semibold"
            className={styles.tokenAmount}
          >
            {formatLamports(lamports)}
          </Typography>
        </div>
      </TxRow>
      {to && (
        <TxRow label="to" className={rowClassName}>
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
