import { useState, type FC } from "react";
import type { CosmosArbitrarySignPayload } from "@oko-wallet/oko-sdk-core";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";

import styles from "./cosmos_arbitrary_signature_content.module.scss";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { MetadataContent } from "@oko-wallet-attached/components/modal_variants/common/metadata_content/metadata_content";

interface CosmosArbitrarySignatureContentProps {
  payload: CosmosArbitrarySignPayload;
}

export const CosmosArbitrarySignatureContent: FC<
  CosmosArbitrarySignatureContentProps
> = ({ payload }) => {
  const [isViewRawData, setIsViewRawData] = useState(false);

  return (
    <div>
      <MetadataContent
        origin={payload.origin}
        chainInfo={payload.chain_info}
        signer={payload.signer}
      />

      <Spacing height={28} />

      <div className={styles.messageHeader}>
        <Typography size="sm" color="tertiary" weight="semibold">
          Message
        </Typography>
        <div
          onClick={() => setIsViewRawData(!isViewRawData)}
          className={styles.viewButtonTextRow}
        >
          <Typography size="xs" color="tertiary" weight="medium">
            {isViewRawData ? "Smart View" : "Raw View"}
          </Typography>
          <ChevronRightIcon color="var(--fg-tertiary)" />
        </div>
      </div>
      <Spacing height={8} />

      <div className={styles.dataContainer}>
        {isViewRawData ? (
          <MakeSignatureRawCodeBlock
            code={JSON.stringify(payload.signDoc, null, 2)}
          />
        ) : (
          <Typography
            size="md"
            color="tertiary"
            weight="medium"
            className={styles.data}
          >
            {payload.data}
          </Typography>
        )}
      </div>
    </div>
  );
};
