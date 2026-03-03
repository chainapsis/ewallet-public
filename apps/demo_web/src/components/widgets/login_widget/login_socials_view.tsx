import { type FC, Fragment } from "react";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { AppleIcon } from "@oko-wallet/oko-common-ui/icons/apple_icon";
import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { GithubIcon } from "@oko-wallet/oko-common-ui/icons/github_icon";
import { ChevronLeftIcon } from "@oko-wallet/oko-common-ui/icons/chevron_left";
import { Spacing } from "@oko-wallet-common-ui/spacing/spacing";

import styles from "./login_widget.module.scss";

export interface LoginSocialsViewProps {
  onBack: () => void;
  onSignIn: (method: "telegram" | "x" | "apple" | "discord" | "github") => void;
}

export const LoginSocialsView: FC<LoginSocialsViewProps> = ({
  onBack,
  onSignIn,
}) => {
  return (
    <Fragment>
      <div className={styles.backRow}>
        <div className={styles.backIcon} onClick={onBack}>
          <ChevronLeftIcon size={24} color={"var(--fg-primary)"} />
        </div>
        <Typography
          size="sm"
          weight="medium"
          color="primary"
          className={styles.backText}
        >
          Login or sign up
        </Typography>
      </div>
      <Spacing height={26} />
      <div className={styles.socialsList}>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onSignIn("x")}
        >
          <XIcon size={20} />
          <Typography
            size="sm"
            weight="semibold"
            color="secondary"
            style={{ padding: "0 2px" }}
          >
            X
          </Typography>
        </Button>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onSignIn("telegram")}
        >
          <TelegramIcon size={20} />
          <Typography
            size="sm"
            weight="semibold"
            color="secondary"
            style={{ padding: "0 2px" }}
          >
            Telegram
          </Typography>
        </Button>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onSignIn("discord")}
        >
          <DiscordIcon size={20} />
          <Typography
            size="sm"
            weight="semibold"
            color="secondary"
            style={{ padding: "0 2px" }}
          >
            Discord
          </Typography>
        </Button>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onSignIn("github")}
        >
          <GithubIcon size={20} />
          <Typography
            size="sm"
            weight="semibold"
            color="secondary"
            style={{ padding: "0 2px" }}
          >
            GitHub
          </Typography>
        </Button>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onSignIn("apple")}
          disabled
        >
          <AppleIcon size={20} />
          <Typography
            size="sm"
            weight="semibold"
            color="disabled"
            style={{ padding: "0 2px" }}
          >
            Apple
          </Typography>
        </Button>
      </div>
    </Fragment>
  );
};
