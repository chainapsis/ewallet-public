import type { FC } from "react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";

import styles from "./sponsored_fee.module.scss";

export const SponsoredFeeTooltip: FC = () => {
  return (
    <div className={styles.tooltip}>
      <Typography color="primary-on-brand" size="xs" weight="medium">
        You can send another free transaction when the 5-minute timer resets.
      </Typography>
    </div>
  );
};
