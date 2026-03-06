import { AnchoredMenu } from "@oko-wallet/oko-common-ui/anchored_menu";
import { EditIcon } from "@oko-wallet/oko-common-ui/icons/edit";
import { LogoutIcon } from "@oko-wallet/oko-common-ui/icons/logout";
import { PasswordIcon } from "@oko-wallet/oko-common-ui/icons/password";
import { ThreeDotsVerticalIcon } from "@oko-wallet/oko-common-ui/icons/three_dots_vertical";
import { SidebarAccountInfo } from "@oko-wallet/oko-common-ui/sidebar_account_info";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { FC } from "react";

import styles from "./account_info_with_sub_menu.module.scss";
import { useCustomerInfo } from "@oko-wallet-ct-dashboard/hooks/use_customer_info";
import { paths } from "@oko-wallet-ct-dashboard/paths";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

export const AccountInfoWithSubMenu: FC = () => {
  const router = useRouter();

  const customer = useCustomerInfo();
  const user = useAppState((state) => state.user);

  const resetUser = useAppState((state) => state.resetUser);
  const resetToken = useAppState((state) => state.resetToken);
  const queryClient = useQueryClient();

  return (
    <AnchoredMenu
      placement="right-end"
      TriggerComponent={
        <SidebarAccountInfo
          email={user?.email ?? ""}
          label={customer.data?.label ?? ""}
          logoImageUrl={customer.data?.logo_url ?? ""}
          className={styles.sidebarTrigger}
          TopRightIcon={
            <span className={styles.iconWrapper}>
              <ThreeDotsVerticalIcon color="var(--fg-quaternary)" size={16} />
            </span>
          }
        />
      }
      HeaderComponent={
        <SidebarAccountInfo
          email={user?.email ?? ""}
          label={customer.data?.label ?? ""}
          logoImageUrl={customer.data?.logo_url ?? ""}
          className={styles.menuHeader}
        />
      }
      menuItems={[
        {
          id: "edit-info",
          label: "Edit Info",
          icon: <EditIcon size={16} />,
          onClick: () => {
            router.push(paths.edit_info);
          },
        },
        {
          id: "change-password",
          label: "Change Password",
          icon: <PasswordIcon size={16} />,
          onClick: () => {
            router.push(paths.change_password);
          },
        },
        {
          id: "sign-out",
          label: "Sign Out",
          icon: <LogoutIcon size={16} />,
          onClick: () => {
            queryClient.clear();
            resetUser();
            resetToken();
          },
        },
      ]}
      className={styles.menu}
    />
  );
};
