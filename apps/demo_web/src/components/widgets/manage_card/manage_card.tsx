import { CodeIcon } from "@oko-wallet/oko-common-ui/icons/code";
import { CompassIcon } from "@oko-wallet/oko-common-ui/icons/compass";
import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { UserIcon } from "@oko-wallet/oko-common-ui/icons/user";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import { Widget } from "../widget_components";
import styles from "./manage_card.module.scss";

export interface ManageCardProps {
  dashboardUrl?: string;
  homeUrl?: string;
}

export const ManageCard: FC<ManageCardProps> = ({
  dashboardUrl = "#",
  homeUrl = "#",
}) => {
  const handleOpenDashboard = () => {
    window.open(dashboardUrl, "_blank");
  };

  const handleOpenHome = () => {
    window.open(homeUrl, "_blank");
  };

  return (
    <Widget>
      <div className={styles.container}>
        <div className={styles.header}>
          <CompassIcon size={16} color="#ED6B25" />
          <Typography size="md" weight="semibold" color="primary">
            Manage with Oko
          </Typography>
        </div>

        <Spacing height={12} />

        <button
          type="button"
          className={styles.detailsRow}
          onClick={handleOpenDashboard}
        >
          <div className={styles.linkContent}>
            <div className={styles.titleRow}>
              <Typography
                tagType="span"
                size="md"
                weight="semibold"
                color="secondary"
                className={styles.title}
              >
                Dapp Dashboard
              </Typography>
              <div className={styles.badge}>
                <CodeIcon size={12} color="var(--text-quaternary)" />
                <Typography
                  tagType="span"
                  size="xs"
                  weight="medium"
                  className={styles.badgeText}
                >
                  For Devs
                </Typography>
              </div>
            </div>
            <Typography
              size="sm"
              weight="medium"
              color="tertiary"
              className={styles.description}
            >
              Control integrations for your dapps
            </Typography>
          </div>
          <span className={styles.linkIcon}>
            <ExternalLinkOutlinedIcon color="currentColor" />
          </span>
        </button>

        <Spacing height={8} />

        <button
          type="button"
          className={styles.detailsRow}
          onClick={handleOpenHome}
        >
          <div className={styles.linkContent}>
            <div className={styles.titleRow}>
              <Typography
                tagType="span"
                size="md"
                weight="semibold"
                color="secondary"
                className={styles.title}
              >
                Oko Home
              </Typography>
              <div className={styles.badge}>
                <UserIcon size={12} color="var(--text-quaternary)" />
                <Typography
                  tagType="span"
                  size="xs"
                  weight="medium"
                  className={styles.badgeText}
                >
                  For Users
                </Typography>
              </div>
            </div>
            <Typography
              size="sm"
              weight="medium"
              color="tertiary"
              className={styles.description}
            >
              Manage your assets and wallets
            </Typography>
          </div>
          <span className={styles.linkIcon}>
            <ExternalLinkOutlinedIcon color="currentColor" />
          </span>
        </button>
      </div>
    </Widget>
  );
};
