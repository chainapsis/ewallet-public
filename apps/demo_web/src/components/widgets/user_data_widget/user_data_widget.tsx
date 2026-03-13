import { CodeIcon } from "@oko-wallet/oko-common-ui/icons/code";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./user_data_widget.module.scss";
import { Widget } from "@oko-wallet-demo-web/components/widgets/widget_components";

export const UserDataWidget: FC<UserDataWidgetProps> = ({ userData }) => {
  const isLoggedIn = !!userData;

  return (
    <Widget>
      <div className={styles.container}>
        <div className={styles.title}>
          <CodeIcon size={16} color="var(--fg-tertiary)" />
          <Typography size="sm" weight="semibold" color="secondary">
            User Data
          </Typography>
        </div>

        {isLoggedIn ? (
          <Typography
            tagType="div"
            size="sm"
            weight="medium"
            color="quaternary"
            className={styles.data}
          >
            <pre>{JSON.stringify(userData, null, 2)}</pre>
          </Typography>
        ) : (
          <div className={styles.asset}>
            <img
              src={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}/assets/user-data-example.png`}
              width="100%"
              alt=""
            />
            <Typography
              size="sm"
              weight="medium"
              color="quaternary"
              className={styles.placeholder}
            >
              Login to see details
            </Typography>
          </div>
        )}
      </div>
    </Widget>
  );
};

export interface UserDataWidgetProps {
  userData?: Record<string, any>;
}
