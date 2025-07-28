import React from "react";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import { Widget } from "@keplr-ewallet-demo-web/components/widgets/widget_components";
import styles from "./user_data_widget.module.scss";

export const UserDataWidget: React.FC<UserDataWidgetProps> = ({ userData }) => {
  const isLoggedIn = !!userData;

  return (
    <Widget>
      <div className={styles.container}>
        <Typography
          size="sm"
          weight="semibold"
          color="secondary"
          className={styles.title}
        >
          User Data
        </Typography>
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
          <Typography
            size="sm"
            weight="medium"
            color="quaternary"
            className={styles.placeholder}
          >
            Login to see details
          </Typography>
        )}
      </div>
    </Widget>
  );
};

export interface UserDataWidgetProps {
  userData?: Record<string, any>;
}
