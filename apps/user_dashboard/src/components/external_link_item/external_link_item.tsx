import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import Link from "next/link";
import type { FC } from "react";

import styles from "./external_link_item.module.scss";

export type ExternalLinkItemProps = {
  href: string;
  children: string;
};

export const ExternalLinkItem: FC<ExternalLinkItemProps> = ({
  href,
  children,
}) => {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.wrapper}
    >
      <Typography size="sm" weight="semibold" color="secondary">
        {children}
      </Typography>
      <ExternalLinkOutlinedIcon color="var(--fg-quaternary)" size={16} />
    </Link>
  );
};
