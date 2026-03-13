import type { FC } from "react";

import styles from "./user_data_widget.module.scss";

export const UserDataWidget: FC<UserDataWidgetProps> = ({ userData }) => {
  const isLoggedIn = !!userData;

  return (
    <div>
      <div className={styles.container}>
        <p>User Data</p>
        {isLoggedIn ? (
          <p>
            <pre>{JSON.stringify(userData, null, 2)}</pre>
          </p>
        ) : (
          <p>Login to see details</p>
        )}
      </div>
    </div>
  );
};

export interface UserDataWidgetProps {
  userData?: Record<string, any>;
}
