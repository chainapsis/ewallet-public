"use client";

import { ErrorIcon } from "@oko-wallet/oko-common-ui/icons/error_icon";
import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { LoadingIcon } from "@oko-wallet/oko-common-ui/icons/loading";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import { useEmailCallback } from "@oko-wallet-attached/components/email_callback/use_callback";
import styles from "@oko-wallet-attached/components/google_callback/google_callback.module.scss";
import { useSetThemeInCallback } from "@oko-wallet-attached/hooks/theme";
import { OkoLogoIcon } from "@oko-wallet-common-ui/icons/oko_logo_icon";

export const EmailCallback: FC = () => {
  const theme = useSetThemeInCallback("auth0");
  const { error } = useEmailCallback();

  return (
    <div className={`${styles.wrapper} ${styles.wrapperForSystemTheme}`}>
      <OkoLogoIcon width={115} height={44} theme={theme} />
      <Spacing height={56} />
      {error ? <ErrorMessage error={error} /> : <SuccessMessage />}
      <Spacing height={60} />
    </div>
  );
};

const SuccessMessage: FC = () => {
  return (
    <>
      <LoadingIcon
        size={50}
        className={styles.loadingIcon}
        backgroundColor="var(--bg-tertiary)"
        color="var(--fg-brand-primary)"
      />
      <Spacing height={19} />
      <Typography size="lg" weight="medium" color="secondary">
        Redirecting...
      </Typography>
      <Spacing height={16} />
      <Typography size="xs" weight="medium" color="secondary">
        Verified successfully. Signing you in...
      </Typography>
    </>
  );
};

const ErrorMessage: FC<{ error: string }> = ({ error }) => {
  const errorCode = error || "unknown_error";
  const isParamsNotSufficient = errorCode === "params_not_sufficient";
  const errorMessage = isParamsNotSufficient
    ? `Error Code: ${errorCode}\n\nFailed to get the required information from Auth0. Please contact Oko for support.`
    : `Error Code: ${errorCode}`;

  return (
    <>
      <div className={styles.errorIconContainer}>
        <div className={styles.ring1} />
        <div className={styles.ring2} />
        <ErrorIcon size={28} color="var(--fg-error-primary)" />
      </div>
      <Spacing height={32} />

      <a
        href="https://help.keplr.app/"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.supportLink}
      >
        <Typography size="sm" weight="medium" color="secondary">
          Having problems?
        </Typography>
        <Typography
          className={styles.textUnderline}
          size="sm"
          weight="medium"
          color="secondary"
        >
          Get support
        </Typography>
        <ExternalLinkOutlinedIcon color="var(--fg-quaternary-hover)" />
      </a>

      <Spacing height={32} />
      <div className={styles.errorMessageContainer}>
        <Typography size="sm" weight="medium" color="error-primary">
          {errorMessage}
        </Typography>
      </div>
    </>
  );
};
