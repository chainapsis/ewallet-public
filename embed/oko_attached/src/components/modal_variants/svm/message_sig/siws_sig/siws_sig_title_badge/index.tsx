import { Typography } from "@oko-wallet/oko-common-ui/typography";

import styles from "./styles.module.scss";
import { SOLANA_LOGO_URL } from "@oko-wallet-attached/constants/urls";

export const SiwsSigTitleBadge = () => {
  return (
    <div className={styles.badgeContainer}>
      <img src={SOLANA_LOGO_URL} alt="Solana" className={styles.solanaLogo} />
      <Typography size="lg" color="primary" weight="bold">
        Sign In With Solana
      </Typography>
    </div>
  );
};
