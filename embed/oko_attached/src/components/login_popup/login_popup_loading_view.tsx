import { LoadingCircleIcon } from "@oko-wallet/oko-common-ui/icons/loading_circle_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./popup_loading_view.module.scss";

export const LoginPopupLoadingView: FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <LoadingCircleIcon size={62} />
        <Typography size="md" weight="medium" className={styles.text}>
          Signing in...
        </Typography>
      </div>
    </div>
  );
};
