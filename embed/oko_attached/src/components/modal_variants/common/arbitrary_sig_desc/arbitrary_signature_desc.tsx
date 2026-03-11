import type { FC } from "react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { useMobileMode } from "@oko-wallet-attached/hooks/mobile_mode";

import styles from "./arbitrary_signature_description.module.scss";

export const ArbitrarySignatureDesc: FC = () => {
  const isMobile = useMobileMode();

  return (
    <Typography
      size={isMobile ? "sm" : "xs"}
      weight="medium"
      color="tertiary"
      className={styles.description}
    >
      This step doesn’t involve the blockchain. No fees apply.
    </Typography>
  );
};
