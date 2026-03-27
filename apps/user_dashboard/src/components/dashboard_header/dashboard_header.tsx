"use client";

import { AnchoredMenu } from "@oko-wallet/oko-common-ui/anchored_menu";
import { IconButton } from "@oko-wallet/oko-common-ui/icon_button";
import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { DotsHorizontalIcon } from "@oko-wallet/oko-common-ui/icons/dots_horizontal";
import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { GithubIcon } from "@oko-wallet/oko-common-ui/icons/github_icon";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { LogoutIcon } from "@oko-wallet/oko-common-ui/icons/logout";
import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
import { MenuIcon } from "@oko-wallet/oko-common-ui/icons/menu";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { useOko } from "@oko-wallet/oko-sdk-react";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Property } from "csstype";
import { useRouter } from "next/navigation";
import type { FC, ReactNode } from "react";

import styles from "./dashboard_header.module.scss";
import {
  OKO_FEATURE_REQUEST_ENDPOINT,
  OKO_GET_SUPPORT_ENDPOINT,
} from "@oko-wallet-user-dashboard/fetch";
import { useSignOut } from "@oko-wallet-user-dashboard/hooks/use_sign_out";
import { paths } from "@oko-wallet-user-dashboard/paths";
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
    case "github":
      return <GithubIcon size={size} />;
    default:
      return null;
  }
}

function getMobileTriggerIcon(authType: AuthType | null): ReactNode {
  switch (authType) {
    case "google":
      return <GoogleIcon width={24} height={24} />;
    case "discord":
      return <DiscordIcon size={20} />;
    case "telegram":
      return <TelegramIcon size={24} />;
    case "x":
      return <XIcon size={24} />;
    case "github":
      return <GithubIcon size={24} />;
    case "auth0":
      return <MailboxIcon size={20} color="var(--fg-tertiary)" />;
    default:
      return null;
  }
}

function MenuKeyIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 9H15.01M15 15C18.3137 15 21 12.3137 21 9C21 5.68629 18.3137 3 15 3C11.6863 3 9 5.68629 9 9C9 9.27368 9.01832 9.54308 9.05381 9.80704C9.11218 10.2412 9.14136 10.4583 9.12172 10.5956C9.10125 10.7387 9.0752 10.8157 9.00469 10.9419C8.937 11.063 8.81771 11.1823 8.57913 11.4209L3.46863 16.5314C3.29568 16.7043 3.2092 16.7908 3.14736 16.8917C3.09253 16.9812 3.05213 17.0787 3.02763 17.1808C3 17.2959 3 17.4182 3 17.6627V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H6.33726C6.58185 21 6.70414 21 6.81923 20.9724C6.92127 20.9479 7.01881 20.9075 7.10828 20.8526C7.2092 20.7908 7.29568 20.7043 7.46863 20.5314L12.5791 15.4209C12.8177 15.1823 12.937 15.063 13.0581 14.9953C13.1843 14.9248 13.2613 14.8987 13.4044 14.8783C13.5417 14.8586 13.7588 14.8878 14.193 14.9462C14.4569 14.9817 14.7263 15 15 15Z" />
    </svg>
  );
}

function MenuLightbulbIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 17.6586V20C10 21.1046 10.8954 22 12 22C13.1046 22 14 21.1046 14 20V17.6586M12 2V3M3 12H2M5.5 5.5L4.8999 4.8999M18.5 5.5L19.1002 4.8999M22 12H21M18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12Z" />
    </svg>
  );
}

function MenuChatIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.09436 11.2288C6.03221 10.8282 5.99996 10.4179 5.99996 10C5.99996 5.58172 9.60525 2 14.0526 2C18.4999 2 22.1052 5.58172 22.1052 10C22.1052 10.9981 21.9213 11.9535 21.5852 12.8345C21.5154 13.0175 21.4804 13.109 21.4646 13.1804C21.4489 13.2512 21.4428 13.301 21.4411 13.3735C21.4394 13.4466 21.4493 13.5272 21.4692 13.6883L21.8717 16.9585C21.9153 17.3125 21.9371 17.4895 21.8782 17.6182C21.8266 17.731 21.735 17.8205 21.6211 17.8695C21.4911 17.9254 21.3146 17.8995 20.9617 17.8478L17.7765 17.3809C17.6101 17.3565 17.527 17.3443 17.4512 17.3448C17.3763 17.3452 17.3245 17.3507 17.2511 17.3661C17.177 17.3817 17.0823 17.4172 16.893 17.4881C16.0097 17.819 15.0524 18 14.0526 18C13.6344 18 13.2237 17.9683 12.8227 17.9073M7.63158 22C10.5965 22 13 19.5376 13 16.5C13 13.4624 10.5965 11 7.63158 11C4.66668 11 2.26316 13.4624 2.26316 16.5C2.26316 17.1106 2.36028 17.6979 2.53955 18.2467C2.61533 18.4787 2.65322 18.5947 2.66566 18.6739C2.67864 18.7567 2.68091 18.8031 2.67608 18.8867C2.67145 18.9668 2.65141 19.0573 2.61134 19.2383L2 22L4.9948 21.591C5.15827 21.5687 5.24 21.5575 5.31137 21.558C5.38652 21.5585 5.42641 21.5626 5.50011 21.5773C5.5701 21.5912 5.67416 21.6279 5.88227 21.7014C6.43059 21.8949 7.01911 22 7.63158 22Z" />
    </svg>
  );
}

const OKO_LOGO_URL =
  "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/icons/oko_logo.png";
const OKO_LOGO_WHITE_URL =
  "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/icons/oko_logo_white.png";

export const DashboardHeader: FC<{
  position?: Property.Position;
  logoVariant?: "default" | "white";
}> = ({ position = "static", logoVariant = "default" }) => {
  const isLeftBarOpen = useViewState((state) => state.isLeftBarOpen);
  const toggleLeftBarOpen = useViewState((state) => state.toggleLeftBarOpen);

  const { isSignedIn, email, name, authType } = useOko();
  const usesName =
    authType === "discord" ||
    authType === "telegram" ||
    authType === "x" ||
    authType === "github";
  const displayIdentifier = usesName ? name : email;
  const signOut = useSignOut();
  const router = useRouter();

  return (
    <div className={styles.wrapper} style={{ position }}>
      <div className={styles.leftSection}>
        <span className={styles.menuIconWrapper} onClick={toggleLeftBarOpen}>
          {isLeftBarOpen ? (
            <XCloseIcon color="var(--fg-primary)" size={24} />
          ) : (
            <MenuIcon color="var(--fg-primary)" size={24} />
          )}
        </span>
        <img
          src={logoVariant === "white" ? OKO_LOGO_WHITE_URL : OKO_LOGO_URL}
          alt="Oko"
          width={72}
          height={28}
          className={styles.logo}
          onClick={() => router.push(paths.home)}
        />
      </div>

      <div className={styles.rightSection}>
        {isSignedIn && (
          <div className={styles.accountArea}>
            {authType !== "auth0" && (
              <span className={styles.authProviderIcon}>
                {getAuthProviderIcon(authType, 24)}
              </span>
            )}
            <Typography
              size="md"
              weight="medium"
              color="secondary"
              className={styles.accountEmail}
            >
              {displayIdentifier}
            </Typography>
            <AnchoredMenu
              placement="bottom-end"
              TriggerComponent={
                <>
                  <span className={styles.mobileMenuTrigger}>
                    {getMobileTriggerIcon(authType)}
                  </span>
                  <span className={styles.desktopMenuTrigger}>
                    <IconButton
                      hierarchy="tertiary"
                      size="sm"
                      icon={<DotsHorizontalIcon size={20} />}
                    />
                  </span>
                </>
              }
              HeaderComponent={
                <div className={styles.menuHeader}>
                  <div className={styles.menuUserInfo}>
                    {authType !== "auth0" && (
                      <span className={styles.authProviderIcon}>
                        {getAuthProviderIcon(authType, 24)}
                      </span>
                    )}
                    <Typography
                      size="sm"
                      weight="semibold"
                      color="primary"
                      className={styles.menuEmail}
                    >
                      {displayIdentifier}
                    </Typography>
                  </div>
                </div>
              }
              menuSections={[
                {
                  id: "security",
                  label: "Security",
                  items: [
                    {
                      id: "export-private-key",
                      label: "Export Private Key",
                      icon: <MenuKeyIcon />,
                      onClick: () => {
                        window.dispatchEvent(
                          new CustomEvent("oko:reset-export-step"),
                        );
                        router.push(paths.export_private_key);
                      },
                    },
                  ],
                },
                {
                  id: "links",
                  items: [
                    {
                      id: "feature-request",
                      label: "Feature Request",
                      icon: <MenuLightbulbIcon />,
                      trailingIcon: <ExternalLinkOutlinedIcon />,
                      onClick: () => {
                        window.open(OKO_FEATURE_REQUEST_ENDPOINT, "_blank");
                      },
                    },
                    {
                      id: "get-support",
                      label: "Get Support",
                      icon: <MenuChatIcon />,
                      trailingIcon: <ExternalLinkOutlinedIcon />,
                      onClick: () => {
                        window.open(OKO_GET_SUPPORT_ENDPOINT, "_blank");
                      },
                    },
                  ],
                },
              ]}
              footerSection={{
                id: "account",
                items: [
                  {
                    id: "sign-out",
                    label: "Sign out",
                    icon: <LogoutIcon size={20} />,
                    onClick: signOut,
                  },
                ],
              }}
              className={styles.accountMenu}
            />
          </div>
        )}
      </div>
    </div>
  );
};
