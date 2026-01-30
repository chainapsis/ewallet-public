import { Button } from "@oko-wallet/oko-common-ui/button";
import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";
import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { Logo } from "@oko-wallet/oko-common-ui/logo";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { FC } from "react";

import styles from "./login_widget.module.scss";

export interface LoginDefaultViewProps {
  onSignIn: (method: AuthType) => void;
  onShowSocials: () => void;
}

export const LoginDefaultView: FC<LoginDefaultViewProps> = ({
  onSignIn,
  onShowSocials,
}) => {
  return (
    <>
      <Logo theme="light" width={58} height={22} className={styles.logo} />

      <div className={styles.loginMethodsWrapper}>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onSignIn("auth0")}
        >
          <MailboxIcon size={20} color={"var(--fg-tertiary)"} />
          <Spacing width={2} />
          Email
        </Button>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onSignIn("google")}
        >
          <GoogleIcon width={20} height={20} />
          Google
        </Button>

        <Button variant="secondary" size="md" fullWidth onClick={onShowSocials}>
          <div className={styles.socialIconWrapper}>
            <XIcon size={16} />
            <TelegramIcon size={16} />
            <DiscordIcon size={16} />
          </div>
          <Typography
            size="sm"
            weight="semibold"
            color="secondary"
            style={{ padding: "0 2px" }}
          >
            Other Socials
          </Typography>
          <ChevronRightIcon size={20} color={"var(--fg-quaternary)"} />
        </Button>
      </div>
    </>
  );
};
