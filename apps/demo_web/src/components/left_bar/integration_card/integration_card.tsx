import { CloseButtonIcon } from "@oko-wallet/oko-common-ui/icons/close_button_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./integration_card.module.scss";

const GET_STARTED_URL = "https://form.typeform.com/to/MxrBGq9b";

interface IntegrationCardProps {
  onClose: () => void;
}

export const IntegrationCard: FC<IntegrationCardProps> = ({ onClose }) => {
  return (
    <div className={styles.container}>
      <button
        className={styles.closeButton}
        type="button"
        aria-label="Close"
        onClick={onClose}
      >
        <CloseButtonIcon size={12} />
      </button>
      <div className={styles.titleRow}>
        <Typography size="sm" weight="semibold" color="primary">
          Integrate Officially!
        </Typography>
      </div>
      <Typography
        size="sm"
        weight="regular"
        color="tertiary"
        className={styles.description}
      >
        Get Oko’s managed infra and production support with official
        integration.
      </Typography>

      <img
        src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/assets/oko-demo-intergrate-officially.png`}
        className={styles.image}
        alt=""
      />

      <div className={styles.getStartedButton}>
        <Typography
          tagType="a"
          size="sm"
          weight="semibold"
          color="primary"
          href={GET_STARTED_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Started →
        </Typography>
      </div>
    </div>
  );
};
