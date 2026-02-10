"use client";

import type { AuthType } from "@oko-wallet/oko-types/auth";
import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
import { PasswordIcon } from "@oko-wallet/oko-common-ui/icons/password";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { ReactNode } from "react";

import styles from "./page.module.scss";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";

function getAuthProviderInfo(authType: AuthType | null): {
  icon: ReactNode;
  label: string;
} {
  switch (authType) {
    case "google":
      return {
        icon: <GoogleIcon width={24} height={24} />,
        label: "Google Login",
      };
    case "discord":
      return { icon: <DiscordIcon size={24} />, label: "Discord" };
    case "telegram":
      return { icon: <TelegramIcon size={24} />, label: "Telegram" };
    case "x":
      return { icon: <XIcon size={24} />, label: "X" };
    case "auth0":
      return { icon: <MailboxIcon size={24} />, label: "Email" };
    default:
      return { icon: null, label: "" };
  }
}

function LockIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      width={28}
      height={28}
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

export default function Page() {
  const email = useUserInfoState((state) => state.email);
  const name = useUserInfoState((state) => state.name);
  const authType = useUserInfoState((state) => state.authType);
  const authInfo = getAuthProviderInfo(authType);
  const usesName = authType === "discord" || authType === "telegram" || authType === "x";
  const displayIdentifier = usesName ? name : email;

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <span className={styles.headingIcon}>
          <KeyIcon />
        </span>
        <Typography size="xl" weight="semibold" color="primary">
          Export Private Key
        </Typography>
        <span className={styles.stepBadge}>
          <Typography size="xs" weight="medium" color="secondary">
            1/2
          </Typography>
        </span>
      </div>

      <div className={styles.content}>
        <Typography size="lg" weight="semibold" color="primary">
          Log in again to reveal your private key
        </Typography>

        <div style={{ height: 24 }} />

        <div className={styles.loginSection}>
          <Typography
            size="xs"
            weight="semibold"
            color="secondary"
            className={styles.loginLabel}
          >
            You're logged in with:
          </Typography>
          <div className={styles.authCard}>
            <div className={styles.authCardRow}>
              {authInfo.icon}
              <Typography size="md" weight="semibold" color="primary">
                {authInfo.label}
              </Typography>
            </div>
            <Typography size="md" weight="medium" color="tertiary">
              {displayIdentifier}
            </Typography>
          </div>
        </div>

        <div className={styles.warningSection}>
          <div className={styles.warningItem}>
            <span className={styles.warningIconWrap}>
              <LockIcon />
            </span>
            <div className={styles.warningText}>
              <Typography size="md" weight="semibold" color="secondary">
                Keep your private key secret.
              </Typography>
              <Typography size="md" color="secondary">
                Anyone with it can take full control of your wallet and steal
                your funds.
              </Typography>
            </div>
          </div>
          <div className={styles.warningItem}>
            <span className={styles.warningIconWrap}>
              <AlertTriangleIcon />
            </span>
            <div className={styles.warningText}>
              <Typography size="md" weight="semibold" color="secondary">
                Using or importing this key outside Oko changes how the wallet
                is protected.
              </Typography>
              <Typography size="md" color="secondary">
                You'll be fully responsible for managing your wallet.
              </Typography>
            </div>
          </div>
        </div>

        <Button size="lg" fullWidth>
          Continue
        </Button>
      </div>
    </div>
  );
}
