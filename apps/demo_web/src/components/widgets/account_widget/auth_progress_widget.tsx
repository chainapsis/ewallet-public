import { AppleIcon } from "@oko-wallet/oko-common-ui/icons/apple_icon";
import { GithubIcon } from "@oko-wallet/oko-common-ui/icons/github_icon";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import type { FC } from "react";

import { Widget } from "../widget_components";
import styles from "./auth_progress_widget.module.scss";
import { Spinner } from "./spinner";
import { DiscordIcon } from "@oko-wallet-common-ui/icons/discord_icon";
import type { LoginMethod } from "@oko-wallet-demo-web/types/login";

type AuthProgressWidgetProps = {
  method: LoginMethod;
  status?: "loading" | "failed";
  errorKind?: "signup_disabled" | "generic";
  onRetry?: () => void;
};

export const AuthProgressWidget: FC<AuthProgressWidgetProps> = ({
  method,
  status = "loading",
  errorKind = "generic",
  onRetry,
}) => {
  const isFailed = status === "failed";
  const isSignupDisabled = isFailed && errorKind === "signup_disabled";

  return (
    <Widget>
      <div
        className={cn(styles.signingInWrapper, { [styles.failed]: isFailed })}
      >
        <div className={styles.signingInCircle}>
          {method === "email" && (
            <MailboxIcon size={32} color="var(--fg-quaternary)" />
          )}
          {method === "google" && <GoogleIcon width={48} height={48} />}
          {method === "telegram" && <TelegramIcon size={48} />}
          {method === "x" && <XIcon size={48} />}
          {method === "apple" && <AppleIcon size={48} />}
          {method === "discord" && <DiscordIcon size={48} />}
          {method === "github" && <GithubIcon size={48} />}
          <Spinner
            size={62}
            className={styles.spinnerOverlay}
            status={isFailed ? "failed" : "loading"}
          />
        </div>
        <Spacing height={9} />
        {isSignupDisabled ? (
          <>
            <Typography size="md" weight="medium" color="primary">
              Signups are closed
            </Typography>
            <Spacing height={6} />
            <Typography size="sm" weight="regular" color="secondary">
              Oko is winding down. Existing accounts can still sign in to
              withdraw assets,
              <br />
              but new signups are no longer accepted.
            </Typography>
          </>
        ) : isFailed ? (
          <>
            <Typography size="md" weight="medium" color="primary">
              Login failed
            </Typography>
            {onRetry ? (
              <div className={styles.retryButton} onClick={onRetry}>
                <Typography size="sm" weight="semibold" color="brand-secondary">
                  Retry
                </Typography>
              </div>
            ) : null}
          </>
        ) : (
          <Typography
            size="md"
            weight="medium"
            color="primary"
            className={styles.signingInText}
          >
            Signing in
          </Typography>
        )}
      </div>
    </Widget>
  );
};
