"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FC, useState } from "react";
import { FormattedMessage } from "react-intl";

import { KeyshareNodesTable } from "./keyshare_nodes_table";
import styles from "./keyshare_nodes_view.module.scss";
import { useGetTssAllActivationSetting } from "./use_get_tss_all_activation_setting";
import { useToggleTssAllActivation } from "./use_toggle_tss_all_activation";
import { TitleHeader } from "@oko-wallet-admin/components/title_header/title_header";
import { updateKeyShareNodeMeta } from "@oko-wallet-admin/fetch/ks_node";
import { useAllKeyShareNodes } from "@oko-wallet-admin/fetch/ks_node/use_all_ks_nodes";
import { paths } from "@oko-wallet-admin/paths";
import { useAppState } from "@oko-wallet-admin/state";

export const KeyshareNodesView: FC = () => {
  const router = useRouter();
  const token = useAppState((s) => s.token);
  const queryClient = useQueryClient();

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

  // Registration threshold state from server
  const meta = tssAllActivationData?.key_share_node_meta;
  const sssThreshold = meta?.sss_threshold ?? 2;
  const currentThreshold = meta?.registration_threshold ?? null;
  const activeNodes =
    data?.ksNodes.filter((n) => n.status === "ACTIVE").length ?? 0;

  const [regThresholdSelect, setRegThresholdSelect] = useState<string>("ALL");
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);

  const updateThresholdMutation = useMutation({
    mutationFn: (value: number | null) =>
      updateKeyShareNodeMeta({
        token: token ?? "",
        registration_threshold: value,
      }),
    onSuccess: () => {
      setIsEditingThreshold(false);
      queryClient.invalidateQueries({
        queryKey: ["tss-activation-setting"],
      });
    },
  });

  // Build dropdown options: sssThreshold .. activeNodes + ALL
  const thresholdOptions: string[] = [];
  for (let i = sssThreshold; i <= activeNodes; i++) {
    thresholdOptions.push(String(i));
  }
  thresholdOptions.push("ALL");

  const handleSaveThreshold = () => {
    const value =
      regThresholdSelect === "ALL" ? null : parseInt(regThresholdSelect, 10);

    const displayValue = value === null ? "ALL" : String(value);
    const confirmed = confirm(
      `Change Registration Threshold to ${displayValue}?\n\n` +
        `Active nodes: ${activeNodes} / SSS Threshold: ${sssThreshold}\n\n` +
        "This determines the minimum number of nodes that must respond\n" +
        "during sign-up, sign-in (reshare), and Ed25519 key generation.\n\n" +
        "An incorrect value may block new users from signing up\n" +
        "or prevent existing users from signing in.",
    );
    if (!confirmed) {
      return;
    }

    updateThresholdMutation.mutate(value);
  };

  return (
    <div className={styles.wrapper}>
      <TitleHeader
        title="Keyshare Nodes"
        totalCount={data?.ksNodes.length}
        activeCount={activeNodes}
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

      <div className={styles.settingsSection}>
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>SSS Threshold</span>
          <span className={styles.settingValue}>{sssThreshold}</span>
        </div>
        <Spacing height={12} />
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Registration Threshold</span>
          {isEditingThreshold ? (
            <div className={styles.settingEdit}>
              <select
                value={regThresholdSelect}
                onChange={(e) => setRegThresholdSelect(e.target.value)}
                className={styles.settingInput}
              >
                {thresholdOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={handleSaveThreshold}
                disabled={updateThresholdMutation.isPending}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsEditingThreshold(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className={styles.settingEdit}>
              <span className={styles.settingValue}>
                {currentThreshold === null ? "ALL" : currentThreshold}
              </span>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditingThreshold(true);
                  setRegThresholdSelect(
                    currentThreshold === null
                      ? "ALL"
                      : String(currentThreshold),
                  );
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
        {updateThresholdMutation.isError && (
          <div className={styles.errorText}>
            Failed to update registration threshold
          </div>
        )}
      </div>

      <KeyshareNodesTable />
    </div>
  );
};
