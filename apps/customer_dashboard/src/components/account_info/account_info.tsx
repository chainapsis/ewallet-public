"use client";

import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import Link from "next/link";
import type { FC } from "react";

import styles from "./account_info.module.scss";
import { useCustomerInfo } from "@oko-wallet-ct-dashboard/hooks/use_customer_info";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

export const AccountInfo: FC = () => {
  const user = useAppState((state) => state.user);

  const customer = useCustomerInfo();

  return (
    <div className={styles.wrapper}>
      <div className={styles.customerInfo}>
        {customer.data?.logo_url ? (
          <img src={customer.data?.logo_url} alt="avatar" />
        ) : (
          <Typography
            tagType="span"
            size="md"
            weight="semibold"
            color="quaternary"
            className={styles.fallbackImageText}
          >
            {customer.data?.label.slice(0, 2).toUpperCase()}
          </Typography>
        )}
        <div className={styles.spacer8} />

        <Typography
          tagType="span"
          size="xl"
          weight="semibold"
          color="primary"
          className={styles.customerLabel}
        >
          {customer.data?.label}
        </Typography>
        <div className={styles.spacer4} />

        <Link
          href={customer.data?.url ?? ""}
          className={styles.customerUrl}
          target="_blank"
        >
          <Typography tagType="span" size="xs" weight="medium" color="tertiary">
            {customer.data?.url?.replace(/^https?:\/\//, "")}
          </Typography>
          <ExternalLinkOutlinedIcon
            color="var(--gray-400)"
            className={styles.externalLinkIcon}
          />
        </Link>
      </div>

      <Typography size="md" weight="medium" color="tertiary">
        {user?.email}
      </Typography>
    </div>
  );
};
