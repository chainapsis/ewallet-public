import { Button } from "@oko-wallet/oko-common-ui/button";
import { ChevronLeftIcon } from "@oko-wallet/oko-common-ui/icons/chevron_left";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { FC } from "react";

import styles from "./login_widget.module.scss";
import { DiscordIcon } from "@oko-wallet-common-ui/icons/discord_icon";

export interface LoginSocialsViewProps {
  onBack: () => void;
  onSignIn: (method: AuthType) => void;
}

export const LoginSocialsView: FC<LoginSocialsViewProps> = ({
  onBack,
  onSignIn,
}) => {
  return (
    <>
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

        {/* <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onSignIn("apple")}
        >
          <AppleIcon size={20} />
          <Typography
            size="sm"
            weight="semibold"
            color="secondary"
            style={{ padding: "0 2px" }}
          >
            Apple
          </Typography>
        </Button> */}
      </div>
    </>
  );
};
