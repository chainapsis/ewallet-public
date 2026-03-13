import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./user_email_verified_cell.module.scss";

interface UserEmailVerifiedCellUser {
  // customer_id: string;
  // user_id: string;
  // status: CustomerDashboardUserStatus;
  email: string;
  is_email_verified: boolean;
  has_sent_inactive_reminder: boolean;
  has_sent_unverified_reminder: boolean;
}

interface UserEmailVerifiedCellProps {
  users: UserEmailVerifiedCellUser[];
}

export const UserEmailVerifiedCell: FC<UserEmailVerifiedCellProps> = ({
  users,
}) => {
  if (users.length === 0) {
    return (
      <Typography color="tertiary" size="sm">
        No users
      </Typography>
    );
  }

  return (
    <div className={styles.wrapper}>
      {users.map((user, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: display-only list
        <div key={index} className={styles.userItem}>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            <Badge
              label={user.is_email_verified ? "Verified" : "Unverified"}
              color={user.is_email_verified ? "success" : "warning"}
              size="sm"
            />
            {user.has_sent_inactive_reminder && (
              <Badge label="Inactive Reminder Sent" color="success" size="sm" />
            )}
            {user.has_sent_unverified_reminder && (
              <Badge
                label="Verification Reminder Sent"
                color="success"
                size="sm"
              />
            )}
          </div>
          <Typography color="primary" size="sm" className={styles.email}>
            {user.email}
          </Typography>
        </div>
      ))}
    </div>
  );
};
