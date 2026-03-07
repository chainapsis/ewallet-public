import { type FC, Fragment } from "react";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { Logo } from "@oko-wallet/oko-common-ui/logo";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { GithubIcon } from "@oko-wallet/oko-common-ui/icons/github_icon";
import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
import { OkoLogoWithNameIcon } from "@oko-wallet/oko-common-ui/icons/oko_logo_with_name_icon";

import styles from "./login_widget.module.scss";
import type { LoginMethod } from "@oko-wallet-demo-web/types/login";
import { useThemeState } from "@oko-wallet-demo-web/state/theme";

export interface LoginDefaultViewProps {
  onSignIn: (method: LoginMethod) => void;
  onShowSocials: () => void;
}

export const LoginDefaultView: FC<LoginDefaultViewProps> = ({
  onSignIn,
  onShowSocials,
}) => {
  const theme = useThemeState((state) => state.theme);

  return (
    <Fragment>
      <div className={styles.logoWrapper}>
        <Logo theme={theme} width={84} height={32} />
      </div>

      <div className={styles.loginMethodsWrapper}>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onSignIn("google")}
        >
          <GoogleIcon width={20} height={20} />
          Google
        </Button>

        <div
          className={styles.emailLoginMethod}
          onClick={() => onSignIn("email")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onSignIn("email");
            }
          }}
        >
          <MailboxIcon size={20} color={"var(--text-placeholder)"} />
          <span className={styles.emailInput}>your@email.com</span>
          <span className={styles.loginButton}>Submit</span>
        </div>

        <Button variant="secondary" size="md" fullWidth onClick={onShowSocials}>
          <div className={styles.socialIconWrapper}>
            <TelegramIcon size={16} />
            <XIcon size={16} />
            <DiscordIcon size={16} />
            <GithubIcon size={16} />
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

      <Spacing height={28} />

      <div className={styles.getSupportRow}>
        <OkoLogoWithNameIcon width={47} height={18} theme={theme} />
        <a
          href="https://okowallet.userjot.com/board/report-bugs"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.supportLink}
        >
          <Typography size="xs" weight="medium">
            Get support
          </Typography>
          <ExternalLinkOutlinedIcon />
        </a>
      </div>
    </Fragment>
  );
};
