"use client";

import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC, ReactNode } from "react";

import styles from "./invalid_link.module.scss";

const ILLUSTRATION_URL =
  "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/invalid_link.png";

interface InvalidLinkProps {
  title?: string;
  description?: ReactNode;
}

export const InvalidLink: FC<InvalidLinkProps> = ({
  title = "This invite link is no longer valid.",
  description = (
    <>
      <Typography size="lg" weight="medium" color="secondary">
        This invite may have expired, been used, or cancelled.
      </Typography>
      <Typography size="lg" weight="medium" color="secondary">
        For other issues, contact us at{" "}
        <a href="mailto:contact@oko.app" className={styles.emailLink}>
          contact@oko.app
        </a>
        .
      </Typography>
    </>
  ),
}) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <img
          src={ILLUSTRATION_URL}
          alt="Invalid link illustration"
          width={317}
          height={234}
        />
        <div className={styles.textContent}>
          <Typography size="display-xs" weight="semibold" color="primary">
            {title}
          </Typography>
          {description}
        </div>
      </div>
    </div>
  );
};
