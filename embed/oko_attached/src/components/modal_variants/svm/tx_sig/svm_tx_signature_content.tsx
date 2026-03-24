import { EmptyStateIcon } from "@oko-wallet/oko-common-ui/icons/empty_state_icon";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { SvmTxSignPayload } from "@oko-wallet/oko-sdk-core";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { useMemo } from "react";

import styles from "../common/signature_content.module.scss";
import { SvmTxSummary } from "./svm_tx_summary";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { SignerAddressOrEmail } from "@oko-wallet-attached/components/modal_variants/common/metadata_content/signer_address_or_email/signer_address_or_email";
import { useMobileMode } from "@oko-wallet-attached/hooks/mobile_mode";
import { getChainByChainId } from "@oko-wallet-attached/requests/chain_infos";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import type { ParsedTransaction } from "@oko-wallet-attached/tx-parsers/svm/types";
import { getFaviconUrl } from "@oko-wallet-attached/utils/favicon";

interface SvmTxSignatureContentProps {
  payload: SvmTxSignPayload;
  parsedTx: ParsedTransaction | null;
  parseError: string | null;
  isLoading: boolean;
}

export const SvmTxSignatureContent: FC<SvmTxSignatureContentProps> = ({
  payload,
  parsedTx,
  parseError,
  isLoading,
}) => {
  const { origin, signer, chain_id } = payload;
  const appName = useMemoryState((state) => state.appName);
  const faviconUrl = getFaviconUrl(origin);
  const isMobile = useMobileMode();
  const headingSize = isMobile ? "display-xs" : "lg";

  const { data: chainInfo } = useQuery({
    queryKey: ["chain", chain_id],
    queryFn: () => getChainByChainId(chain_id),
  });

  // Fallback: use CAIP-2 namespace (before colon) as chain name
  // If chain_id is empty, return null to show generic "signature"
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
          <Typography size={headingSize} color="primary" weight="semibold">
            {appName}
          </Typography>
        </div>

        <Spacing height={isMobile ? 8 : 4} />

        <div className={styles.signInfoColumn}>
          <div className={styles.chainInfoRow}>
            <Typography size={headingSize} color="secondary" weight="semibold">
              requested your
            </Typography>
            <div className={styles.chainNameGroup}>
              {chainLogoUrl !== undefined ? (
                <Avatar
                  src={chainLogoUrl}
                  alt={chainName ?? "chain"}
                  size={isMobile ? "md" : "sm"}
                  variant="rounded"
                />
              ) : (
                <EmptyStateIcon size={isMobile ? 24 : 16} />
              )}
              <Typography
                size={headingSize}
                color="secondary"
                weight="semibold"
              >
                {chainName ? `${chainName} signature` : "Network signature"}
              </Typography>
            </div>
          </div>

          <SignerAddressOrEmail signer={signer} initialViewType="Login Info" />
        </div>
      </div>

      <Spacing height={28} />

      <SvmTxSummary
        payload={payload}
        parsedTx={parsedTx}
        parseError={parseError}
        isLoading={isLoading}
      />
    </div>
  );
};
