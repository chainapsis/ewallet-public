import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { ChainInfoForAttachedModal } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";

import styles from "./metadata_content.module.scss";
import { SignerAddressOrEmail } from "./signer_address_or_email/signer_address_or_email";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { useMobileMode } from "@oko-wallet-attached/hooks/mobile_mode";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { getFaviconUrl } from "@oko-wallet-attached/utils/favicon";

interface MakeSignatureModalMetadataContentProps {
  origin: string;
  chainInfo: ChainInfoForAttachedModal;
  signer: string;
  initialViewType?: "View Address" | "Login Info" | null;
}

export const MetadataContent: FC<MakeSignatureModalMetadataContentProps> = ({
  origin,
  chainInfo,
  signer,
  initialViewType = "Login Info",
}) => {
  const appName = useMemoryState((state) => state.appName);
  const faviconUrl = getFaviconUrl(origin);
  const isMobile = useMobileMode();

  const headingSize = isMobile ? "display-xs" : "lg";

  return (
    <div className={styles.wrapper}>
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
            <Avatar
              src={chainInfo.chain_symbol_image_url}
              alt="chain icon"
              size={isMobile ? "md" : "sm"}
              variant="rounded"
            />
            <Typography size={headingSize} color="secondary" weight="semibold">
              {chainInfo.chain_name} signature
            </Typography>
          </div>
        </div>

        <SignerAddressOrEmail
          signer={signer}
          initialViewType={initialViewType}
        />
      </div>
    </div>
  );
};
