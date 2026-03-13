"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { FormattedMessage } from "react-intl";

import { KeyshareNodesTable } from "./keyshare_nodes_table";
import styles from "./keyshare_nodes_view.module.scss";
import { useGetTssAllActivationSetting } from "./use_get_tss_all_activation_setting";
import { useToggleTssAllActivation } from "./use_toggle_tss_all_activation";
import { TitleHeader } from "@oko-wallet-admin/components/title_header/title_header";
import { useAllKeyShareNodes } from "@oko-wallet-admin/fetch/ks_node/use_all_ks_nodes";
import { paths } from "@oko-wallet-admin/paths";

export const KeyshareNodesView: FC = () => {
  const router = useRouter();

  const { data } = useAllKeyShareNodes();
  const { data: tssAllActivationData } = useGetTssAllActivationSetting();
  const toggleAllTssActivation = useToggleTssAllActivation();

  const handleToggleTssActivation = () => {
    const currentStatus =
      tssAllActivationData?.tss_activation_setting?.is_enabled;

    if (currentStatus) {
      if (
        confirm(
          "Are you sure you want to deactivate all TSS features?\nThis will affect all users.",
        )
      ) {
        toggleAllTssActivation.mutate(!currentStatus);
      }
    } else {
      toggleAllTssActivation.mutate(!currentStatus);
    }
  };

  const isActivated = tssAllActivationData?.tss_activation_setting?.is_enabled;

  return (
    <div className={styles.wrapper}>
      <TitleHeader
        title="Keyshare Nodes"
        totalCount={data?.ksNodes.length}
        renderRightContent={() => (
          <div className={styles.buttonGroup}>
            <a
              href="https://keynodes-status.oko.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">
                <FormattedMessage id="view_keynodes_status" />
              </Button>
            </a>
            <Spacing width={16} />
            <Button
              variant="primary"
              className={isActivated ? styles.dangerButton : ""}
              onClick={handleToggleTssActivation}
              disabled={toggleAllTssActivation.isPending}
            >
              <FormattedMessage
                id={
                  isActivated
                    ? "deactivate_all_tss_features"
                    : "activate_all_tss_features"
                }
              />
            </Button>
            <Spacing width={16} />
            <Button
              onClick={() => {
                router.push(paths.ks_nodes_create);
              }}
            >
              <FormattedMessage id="add_new_node" />
            </Button>
          </div>
        )}
      />
      <KeyshareNodesTable />
    </div>
  );
};
