import type { FC } from "react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";

import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import styles from "../instructions.module.scss";
import { TxRow } from "@oko-wallet-attached/components/modal_variants/common/tx_row";
import { SOLANA_LOGO_URL } from "@oko-wallet-attached/constants/urls";

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
}

export const SvmTransferPretty: FC<SvmTransferPrettyProps> = ({
  lamports,
  to,
}) => {
  return (
    <div className={styles.container}>
      <TxRow label="Send">
        <div className={styles.tokenInfo}>
          <Avatar src={SOLANA_LOGO_URL} alt="SOL" size="sm" variant="rounded" />
          <Typography
            color="secondary"
            size="lg"
            weight="semibold"
            className={styles.tokenAmount}
          >
            {formatLamports(lamports)}
          </Typography>
        </div>
      </TxRow>
      {to && (
        <TxRow label="to">
          <Typography
            color="secondary"
            size="sm"
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
