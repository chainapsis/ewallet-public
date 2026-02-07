"use client";

import { ImageWithAlt } from "@oko-wallet/oko-common-ui/image_with_alt";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./connected_apps.module.scss";
import { S3_BUCKET_URL } from "@oko-wallet-user-dashboard/fetch";
import { useConnectedApps } from "@oko-wallet-user-dashboard/hooks/use_connected_apps";

const EMPTY_IMAGE_URL = `${S3_BUCKET_URL}/assets/oko_user_dashboard_connected_app_empty.webp`;
const EMPTY_IMAGE_ALT = `${S3_BUCKET_URL}/assets/oko_user_dashboard_connected_app_empty.png`;
const PLACEHOLDER_IMAGE_URL = `${S3_BUCKET_URL}/assets/oko_user_dashboard_connected_app_placeholder.webp`;
const PLACEHOLDER_IMAGE_ALT = `${S3_BUCKET_URL}/assets/oko_user_dashboard_connected_app_placeholder.png`;

export const ConnectedApps: FC = () => {
  const { data: apps, isLoading, isSuccess, error } = useConnectedApps();

  const isEmpty = apps.length === 0;

  return (
    <div>
      <Typography tagType="h1" size="xl" weight="semibold" color="primary">
        Connected Apps
      </Typography>

      {isLoading && (
        <div className={styles.appsList}>
          {["skeleton-1", "skeleton-2", "skeleton-3"].map((id) => (
            <div key={id} className={styles.appItem}>
              <Skeleton width={48} height={48} borderRadius={8} />
              <div className={styles.appInfo}>
                <Skeleton width={100} height={16} borderRadius={4} />
                <Skeleton width={140} height={14} borderRadius={4} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isSuccess && (
        <Typography tagType="p" size="sm" weight="medium" color="tertiary">
          Error: {error.type}
        </Typography>
      )}

      {!isLoading && isSuccess && !isEmpty && (
        <div className={styles.appsList}>
          {apps.map((app) => (
            <div key={app.customer_id} className={styles.appItem}>
              {app.logo_url ? (
                <img
                  src={app.logo_url}
                  alt={app.label ?? "App logo"}
                  className={styles.appLogo}
                />
              ) : (
                <ImageWithAlt
                  srcSet={PLACEHOLDER_IMAGE_URL}
                  srcAlt={PLACEHOLDER_IMAGE_ALT}
                  alt="App logo placeholder"
                  className={styles.appLogo}
                />
              )}
              <div className={styles.appInfo}>
                <Typography
                  tagType="p"
                  size="md"
                  weight="medium"
                  color="primary"
                  className={styles.appName}
                >
                  {app.label ?? "Unknown App"}
                </Typography>
                <Typography
                  tagType="p"
                  size="sm"
                  weight="regular"
                  color="tertiary"
                  className={styles.appUrl}
                >
                  {app.url ?? "—"}
                </Typography>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && isSuccess && isEmpty && (
        <div className={styles.emptyState}>
          <div className={styles.emptyImageWrapper}>
            <ImageWithAlt
              srcSet={EMPTY_IMAGE_URL}
              srcAlt={EMPTY_IMAGE_ALT}
              alt="Empty Connected Apps Image"
              className={styles.emptyImage}
            />
          </div>
          <Typography tagType="p" size="sm" weight="semibold" color="tertiary">
            No Connected Apps Yet
          </Typography>
          <Typography tagType="p" size="sm" weight="medium" color="quaternary">
            Log in to an app with Oko to see it here.
          </Typography>
        </div>
      )}
    </div>
  );
};
