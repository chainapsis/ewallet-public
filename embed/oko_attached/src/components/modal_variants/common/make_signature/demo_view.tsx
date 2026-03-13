import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import styles from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_signature_modal.module.scss";

export const DemoView: FC = () => {
  return (
    <CommonModal padding="12px">
      <Typography
        size="xs"
        weight="medium"
        color="brand-tertiary"
        className={styles.demoDescription}
      >
        This signing request is for UI preview only.
      </Typography>
      <Typography
        size="xs"
        weight="medium"
        color="brand-tertiary"
        className={styles.demoDescription}
      >
        It will not be broadcast on-chain.
      </Typography>
    </CommonModal>
  );
};
