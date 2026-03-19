"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

  // Registration threshold state
  const [regThresholdInput, setRegThresholdInput] = useState<string>("");
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);

  const { data: metaData, refetch: refetchMeta } = useQuery({
    queryKey: ["keyShareNodeMeta"],
    queryFn: async () => {
      const res = await fetch("/api/admin/key_share_node_meta");
      return null; // Placeholder — actual value comes from ksNodes data
    },
    enabled: false, // We'll get this from the DB directly
  });

  const updateThresholdMutation = useMutation({
    mutationFn: (value: number | null) =>
      updateKeyShareNodeMeta({
        token: token ?? "",
        registration_threshold: value,
      }),
    onSuccess: () => {
      setIsEditingThreshold(false);
      queryClient.invalidateQueries({ queryKey: ["keyShareNodeMeta"] });
    },
  });

  const handleSaveThreshold = () => {
    const value =
      regThresholdInput === "" ? null : parseInt(regThresholdInput, 10);
    if (value !== null && Number.isNaN(value)) {
      return;
    }

    const displayValue =
      value === null ? "null (all-or-nothing)" : String(value);
    const confirmed = confirm(
      `Are you sure you want to change registration_threshold to ${displayValue}?\n\n` +
        "This affects how many KS nodes must succeed for sign-up, reshare, and ed25519 keygen.\n" +
        "Setting this value incorrectly may lock users out of their wallets.",
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
          <span className={styles.settingLabel}>Registration Threshold</span>
          {isEditingThreshold ? (
            <div className={styles.settingEdit}>
              <input
                type="number"
                min={1}
                placeholder="null (all-or-nothing)"
                value={regThresholdInput}
                onChange={(e) => setRegThresholdInput(e.target.value)}
                className={styles.settingInput}
              />
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
                {data?.ksNodes ? "—" : "Loading..."}
              </span>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditingThreshold(true);
                  setRegThresholdInput("");
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
