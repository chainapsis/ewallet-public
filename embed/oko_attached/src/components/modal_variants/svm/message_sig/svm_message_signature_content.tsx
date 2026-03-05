import type { FC } from "react";
import type { SvmMessageSignPayload } from "@oko-wallet/oko-sdk-core";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { EmptyStateIcon } from "@oko-wallet/oko-common-ui/icons/empty_state_icon";

import styles from "../common/signature_content.module.scss";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { SignerAddressOrEmail } from "@oko-wallet-attached/components/modal_variants/common/metadata_content/signer_address_or_email/signer_address_or_email";
import { SvmMessageSummary } from "./svm_message_summary";
import { getFaviconUrl } from "@oko-wallet-attached/utils/favicon";
import { getChainByChainId } from "@oko-wallet-attached/requests/chain_infos";

interface SvmMessageSignatureContentProps {
  payload: SvmMessageSignPayload;
}

export const SvmMessageSignatureContent: FC<
  SvmMessageSignatureContentProps
> = ({ payload }) => {
  const { origin, signer, chain_id } = payload;
  const faviconUrl = getFaviconUrl(origin);

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
              {chainLogoUrl !== undefined ? (
                <Avatar
                  src={chainLogoUrl}
                  alt={chainName ?? "chain"}
                  size="sm"
                  variant="rounded"
                />
              ) : (
                <EmptyStateIcon size={16} />
              )}
              <Typography size="lg" color="secondary" weight="semibold">
                {chainName ? `${chainName} signature` : "Network signature"}
              </Typography>
            </div>
          </div>

          <SignerAddressOrEmail
            signer={signer}
            origin={origin}
            initialViewType={null}
          />
        </div>
      </div>

      <Spacing height={28} />

      <SvmMessageSummary payload={payload} />
    </div>
  );
};
