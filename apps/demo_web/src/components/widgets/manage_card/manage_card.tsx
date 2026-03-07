import { CodeIcon } from "@oko-wallet/oko-common-ui/icons/code";
import { CompassIcon } from "@oko-wallet/oko-common-ui/icons/compass";
import { ExternalLinkOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/external_link_outlined";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { UsersIcon } from "@oko-wallet/oko-common-ui/icons/users";
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
          <CompassIcon size={16} color="var(--fg-tertiary)" />
          <Typography size="md" weight="semibold" color="primary">
            Manage with Oko
          </Typography>
        </div>

        <Spacing height={12} />

        <div className={styles.detailsRow}>
          <div className={styles.linkContent}>
            <div className={styles.titleRow}>
              <Typography
                tagType="span"
                size="md"
                weight="semibold"
                color="secondary"
              >
                Dapp Dashboard
              </Typography>
              <div className={styles.badge}>
                <CodeIcon size={12} color="var(--fg-secondary)" />
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
            <Typography size="sm" weight="medium" color="tertiary">
              Control integrations for your dapps
            </Typography>
          </div>
          <button
            type="button"
            className={styles.linkButton}
            onClick={handleOpenDashboard}
          >
            <ExternalLinkOutlinedIcon color="currentColor" />
          </button>
        </div>

        <Spacing height={8} />

        <div className={styles.detailsRow}>
          <div className={styles.linkContent}>
            <div className={styles.titleRow}>
              <Typography
                tagType="span"
                size="md"
                weight="semibold"
                color="secondary"
              >
                Oko Home
              </Typography>
              <div className={styles.badge}>
                <UsersIcon size={12} color="var(--fg-secondary)" />
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
            <Typography size="sm" weight="medium" color="tertiary">
              Manage your assets and wallets
            </Typography>
          </div>
          <button
            type="button"
            className={styles.linkButton}
            onClick={handleOpenHome}
          >
            <ExternalLinkOutlinedIcon color="currentColor" />
          </button>
        </div>
      </div>
    </Widget>
  );
};
