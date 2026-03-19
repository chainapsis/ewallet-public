import { AnchoredMenu } from "@oko-wallet/oko-common-ui/anchored_menu";
import { LogoutIcon } from "@oko-wallet/oko-common-ui/icons/logout";
import { ThreeDotsVerticalIcon } from "@oko-wallet/oko-common-ui/icons/three_dots_vertical";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";

import styles from "./account_info_with_sub_menu.module.scss";
import { useSignOut } from "@oko-wallet-user-dashboard/hooks/use_sign_out";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";

export const AccountInfoWithSubMenu = () => {
  const signOut = useSignOut();

  const email = useUserInfoState((state) => state.email);

  return (
    <AnchoredMenu
      placement="top-start"
      TriggerComponent={
        <div className={styles.userDetailInfo}>
          <Typography size="sm" color="tertiary" className={styles.userEmail}>
            {email}
          </Typography>
          <span className={styles.iconWrapper}>
            <ThreeDotsVerticalIcon color="var(--fg-quaternary)" size={16} />
          </span>
        </div>
      }
      HeaderComponent={
        <div className={cn(styles.menuHeader, styles.userDetailInfo)}>
          <Typography size="sm" color="tertiary" className={styles.userEmail}>
            {email}
          </Typography>
        </div>
      }
      menuItems={[
        {
          id: "sign-out",
          label: "Sign Out",
          icon: <LogoutIcon size={16} />,
          onClick: signOut,
        },
      ]}
      className={styles.menu}
    />
  );
};
