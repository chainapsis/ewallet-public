import { DoorOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/door_outlined";
import { GithubIcon } from "@oko-wallet/oko-common-ui/icons/github_icon";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import { Widget } from "../widget_components";
import styles from "./account_info_widget.module.scss";
import { AppleIcon } from "@oko-wallet-common-ui/icons/apple_icon";
import { DiscordIcon } from "@oko-wallet-common-ui/icons/discord_icon";
import { MailboxIcon } from "@oko-wallet-common-ui/icons/mailbox";
import { TelegramIcon } from "@oko-wallet-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet-common-ui/icons/x_icon";
import type { LoginMethod } from "@oko-wallet-demo-web/types/login";

export type AccountInfoWidgetProps = {
  type: LoginMethod;
  email: string;
  publicKeySecp256k1: string;
  publicKeyEd25519: string | null;
  name: string | null;
  onSignOut: () => void;
};

export const AccountInfoWidget: FC<AccountInfoWidgetProps> = ({
  type,
  email,
  publicKeySecp256k1,
  publicKeyEd25519,
  name,
  onSignOut,
}) => {
  return (
    <Widget>
      <div className={styles.loginInfoContainer}>
        <div className={styles.loginInfoRow}>
          {type === "google" && <GoogleIcon width={20} height={20} />}
          {type === "email" && <MailboxIcon size={20} />}
          {type === "telegram" && <TelegramIcon size={20} />}
          {type === "x" && <XIcon size={20} />}
          {type === "apple" && <AppleIcon size={20} />}
          {type === "discord" && <DiscordIcon size={20} />}
          {type === "github" && <GithubIcon size={20} />}
          <Typography
            size="lg"
            weight="semibold"
            color="primary"
            className={styles.email}
          >
            {name || email}
          </Typography>
        </div>
        <Spacing height={12} />

        <div className={styles.publicKeyCol}>
          <Typography
            size="sm"
            weight="semibold"
            color="primary"
            className={styles.label}
          >
            Public Key
          </Typography>
          <Typography
            size="sm"
            weight="medium"
            color="tertiary"
            className={styles.publicKey}
          >
            {publicKeySecp256k1}
          </Typography>
        </div>

        <Spacing height={8} />

        <div className={styles.signOutRow}>
          <button type="button" className={styles.signOutButton} onClick={onSignOut}>
            <Typography
              tagType="span"
              size="sm"
              weight="semibold"
              color="tertiary"
            >
              Logout
            </Typography>
            <DoorOutlinedIcon color="var(--fg-quaternary)" />
          </button>
        </div>
      </div>
    </Widget>
  );
};
