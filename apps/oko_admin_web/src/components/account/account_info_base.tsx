import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./account_info_base.module.scss";
import { Avatar } from "./avatar";

export interface AccountInfoBaseProps {
  username: string;
  email: string;
  avatarUrl?: string;
}

export const AccountInfoBase: FC<AccountInfoBaseProps> = ({
  username,
  email,
  avatarUrl,
}: AccountInfoBaseProps) => {
  return (
    <div className={styles.wrapper}>
      <Avatar src={avatarUrl} alt={username} />
      <div className={styles.content}>
        <Typography
          color="primary"
          size="md"
          weight="medium"
          className={styles.username}
        >
          {username}
        </Typography>
        <Typography
          color="tertiary"
          size="sm"
          weight="medium"
          className={styles.email}
        >
          {email}
        </Typography>
      </div>
    </div>
  );
};
