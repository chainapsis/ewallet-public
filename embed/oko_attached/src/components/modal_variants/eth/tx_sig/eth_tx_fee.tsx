import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { EthereumTxSignPayload } from "@oko-wallet/oko-sdk-core";
import cn from "classnames";
import type { FC } from "react";

import styles from "./eth_tx_fee.module.scss";
import type { EstimatedFee } from "./hooks/use_tx_sig_modal";

export const EthereumTxFee: FC<EthereumTxFeeProps> = ({
  primaryErrorMessage,
  isSimulating,
  estimatedFee,
}) => {
  return (
    <div className={styles.feeSummaryContainer}>
      <div className={styles.feeContainer}>
        <Typography color="tertiary" size="xs" weight="medium">
          Fee
        </Typography>
        {isSimulating ? (
          <Skeleton width="100px" className="skeleton--text-md" />
        ) : (
          <Typography color="tertiary" size="xs" weight="medium">
            {estimatedFee?.formatted ?? "-"}
          </Typography>
        )}
      </div>
      {isHavingError(primaryErrorMessage) && (
        <div className={cn(styles.errorMessage, "common-list-scroll")}>
          <Typography color="warning-primary" size="xs" weight="medium">
            {primaryErrorMessage}
          </Typography>
        </div>
      )}
    </div>
  );
};

function isHavingError(primaryErrorMessage: string | null) {
  return primaryErrorMessage !== null && primaryErrorMessage.length > 0;
}

interface EthereumTxFeeProps {
  payload: EthereumTxSignPayload;
  primaryErrorMessage: string | null;
  isSimulating: boolean;
  estimatedFee: EstimatedFee | null;
}
