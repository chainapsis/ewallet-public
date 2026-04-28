import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./sign_with_oko_box.module.scss";
import { useMobileMode } from "@oko-wallet-attached/hooks/mobile_mode";
import {
  DEMO_WEB_ORIGIN,
  USER_DASHBOARD_ORIGINS,
} from "@oko-wallet-attached/requests/endpoints";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { OkoLogoWithNameIcon } from "@oko-wallet-common-ui/icons/oko_logo_with_name_icon";

const userDashboardOrigin = USER_DASHBOARD_ORIGINS?.split(",")?.[0]?.trim();
const BACKUP_URL = userDashboardOrigin
  ? `${userDashboardOrigin}/export_private_key`
  : "https://home.oko.app/export_private_key";

export const SignWithOkoBox: FC<SignWithOkoBoxProps> = ({
  theme,
  hideText,
}) => {
  const isMobile = useMobileMode();
  const hostOrigin = useMemoryState((s) => s.hostOrigin);
  const isDemoWeb = hostOrigin === DEMO_WEB_ORIGIN;
  const showBackupLink = !hideText && !isDemoWeb;

  return (
    <div className={styles.container}>
      {showBackupLink && (
        <span className={styles.shutdownNotice}>
          Oko shuts down Jun 1, 2026.
        </span>
      )}
      <div className={styles.signRow}>
        <div className={styles.signWithSection}>
          {!hideText && (
            <Typography
              size={isMobile ? "sm" : "xs"}
              color="quaternary"
              weight="medium"
            >
              Sign with
            </Typography>
          )}
          <div className={styles.logoContainer}>
            <OkoLogoWithNameIcon
              width={isMobile ? 52 : 39}
              height={isMobile ? 20 : 16}
              theme={theme}
            />
          </div>
        </div>

        {showBackupLink && (
          <a
            href={BACKUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.backupLink}
          >
            Export your private key →
          </a>
        )}
      </div>
    </div>
  );
};

export interface SignWithOkoBoxProps {
  theme: Theme | null;
  hideText?: boolean;
}
