import type { FC } from "react";
import type { SvmAllTxSignPayload } from "@oko-wallet/oko-sdk-core";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import styles from "../common/signature_content.module.scss";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { getFaviconUrl } from "@oko-wallet-attached/utils/favicon";
import { getChainByChainId } from "@oko-wallet-attached/requests/chain_infos";

interface SvmAllTxSignatureContentProps {
  payload: SvmAllTxSignPayload;
}

export const SvmAllTxSignatureContent: FC<
  SvmAllTxSignatureContentProps
> = ({ payload }) => {
  const { origin, chain_id, data } = payload;
  const faviconUrl = getFaviconUrl(origin);
  const txCount = data.serialized_transactions.length;

  const { data: chainInfo } = useQuery({
    queryKey: ["chain", chain_id],
    queryFn: () => getChainByChainId(chain_id),
  });

  const chainName = useMemo(() => {
    if (chainInfo?.chainName) {
      return chainInfo.chainName;
    }
    if (!chain_id) {
      return null;
    }
    const namespace = chain_id.split(":")[0];
    if (!namespace) {
      return null;
    }
    return namespace.charAt(0).toUpperCase() + namespace.slice(1);
  }, [chainInfo?.chainName, chain_id]);

  const chainLogoUrl = chainInfo?.chainSymbolImageUrl;

  return (
    <div className={styles.signatureContent}>
      <div className={styles.metadataWrapper}>
        <div className={styles.originRow}>
          {faviconUrl && faviconUrl.length > 0 && (
            <img
              src={faviconUrl}
              alt="favicon"
              className={styles.originFavicon}
            />
          )}
          <Typography size="lg" color="primary" weight="semibold">
            {origin.replace(/^https?:\/\//, "")}
          </Typography>
        </div>

        <Spacing height={4} />

        <div className={styles.signInfoColumn}>
          <div className={styles.chainInfoRow}>
            <Typography size="lg" color="secondary" weight="semibold">
              requested your
            </Typography>
            <div className={styles.chainNameGroup}>
              {chainLogoUrl && (
                <Avatar
                  src={chainLogoUrl}
                  alt={chainName ?? "chain"}
                  size="sm"
                  variant="rounded"
                />
              )}
              <Typography size="lg" color="secondary" weight="semibold">
                {chainName ? `${chainName} signatures` : "signatures"}
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <Spacing height={16} />

      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "12px",
        }}
      >
        <Typography size="md" color="secondary">
          This request will sign {txCount} transactions at once. Please review
          carefully before approving.
        </Typography>
      </div>
    </div>
  );
};
