"use client";

import type { AuthType } from "@oko-wallet/oko-types/auth";
import { AnchoredMenu } from "@oko-wallet/oko-common-ui/anchored_menu";
import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { LogoutIcon } from "@oko-wallet/oko-common-ui/icons/logout";
import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
import { MenuIcon } from "@oko-wallet/oko-common-ui/icons/menu";
import { PasswordIcon } from "@oko-wallet/oko-common-ui/icons/password";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { ThreeDotsVerticalIcon } from "@oko-wallet/oko-common-ui/icons/three_dots_vertical";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { Property } from "csstype";
import { useRouter } from "next/navigation";
import type { FC, ReactNode } from "react";

import styles from "./dashboard_header.module.scss";
import {
  OKO_FEATURE_REQUEST_ENDPOINT,
  OKO_GET_SUPPORT_ENDPOINT,
} from "@oko-wallet-user-dashboard/fetch";
import { paths } from "@oko-wallet-user-dashboard/paths";
import {
  selectCosmosSDK,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";
import { useViewState } from "@oko-wallet-user-dashboard/state/view";

function getAuthProviderIcon(authType: AuthType | null, size = 16): ReactNode {
  switch (authType) {
    case "google":
      return <GoogleIcon width={size} height={size} />;
    case "discord":
      return <DiscordIcon size={size} />;
    case "telegram":
      return <TelegramIcon size={size} />;
    case "x":
      return <XIcon size={size} />;
    case "auth0":
      return <MailboxIcon size={size} />;
    default:
      return null;
  }
}

const OKO_LOGO_URL =
  "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/icons/oko_logo.png";

export const DashboardHeader: FC<{
  position?: Property.Position;
}> = ({ position = "static" }) => {
  const isLeftBarOpen = useViewState((state) => state.isLeftBarOpen);
  const toggleLeftBarOpen = useViewState((state) => state.toggleLeftBarOpen);

  const isSignedIn = useUserInfoState((state) => state.isSignedIn);
  const email = useUserInfoState((state) => state.email);
  const authType = useUserInfoState((state) => state.authType);
  const clearUserInfo = useUserInfoState((state) => state.clearUserInfo);
  const okoWallet = useSDKState(selectCosmosSDK)?.okoWallet;
  const router = useRouter();

  return (
    <div className={styles.wrapper} style={{ position }}>
      <img
        src={OKO_LOGO_URL}
        alt="Oko"
        width={72}
        height={28}
        className={styles.logo}
      />

      <div className={styles.rightSection}>
        {isSignedIn && (
          <AnchoredMenu
            placement="bottom-end"
            TriggerComponent={
              <div className={styles.accountTrigger}>
                <span className={styles.authProviderIcon}>
                  {getAuthProviderIcon(authType)}
                </span>
                <Typography
                  size="sm"
                  color="secondary"
                  className={styles.accountEmail}
                >
                  {email}
                </Typography>
                <span className={styles.dotsButton}>
                  <ThreeDotsVerticalIcon color="var(--fg-quaternary)" />
                </span>
              </div>
            }
            HeaderComponent={
              <div className={styles.menuHeader}>
                <div className={styles.menuUserInfo}>
                  <span className={styles.authProviderIcon}>
                    {getAuthProviderIcon(authType)}
                  </span>
                  <Typography
                    size="sm"
                    color="tertiary"
                    className={styles.menuEmail}
                  >
                    {email}
                  </Typography>
                </div>
                <Typography
                  size="xs"
                  weight="medium"
                  color="quaternary"
                  className={styles.menuSectionLabel}
                >
                  Security
                </Typography>
              </div>
            }
            menuItems={[
              {
                id: "export-private-key",
                label: "Export Private Key",
                icon: <PasswordIcon size={16} />,
                onClick: () => {
                  router.push(paths.export_private_key);
                },
              },
              {
                id: "feature-request",
                label: "Feature Request",
                icon: <ExternalLinkOutlinedIcon />,
                onClick: () => {
                  window.open(OKO_FEATURE_REQUEST_ENDPOINT, "_blank");
                },
              },
              {
                id: "get-support",
                label: "Get Support",
                icon: <ExternalLinkOutlinedIcon />,
                onClick: () => {
                  window.open(OKO_GET_SUPPORT_ENDPOINT, "_blank");
                },
              },
              {
                id: "sign-out",
                label: "Sign out",
                icon: <LogoutIcon size={16} />,
                onClick: async () => {
                  if (!okoWallet) {
                    console.error("okoWallet is not initialized");
                    return;
                  }

                  await okoWallet.signOut();
                  clearUserInfo();
                },
              },
            ]}
            className={styles.accountMenu}
          />
        )}

        <span className={styles.menuIconWrapper} onClick={toggleLeftBarOpen}>
          {isLeftBarOpen ? (
            <XCloseIcon color="var(--fg-primary)" size={24} />
          ) : (
            <MenuIcon color="var(--fg-primary)" size={24} />
          )}
        </span>
      </div>
    </div>
  );
};
