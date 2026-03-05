import { useState, type FC } from "react";
import type { EthereumArbitrarySignPayload } from "@oko-wallet/oko-sdk-core";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";
import { bytesToString, hexToString } from "viem";

import { MetadataContent } from "@oko-wallet-attached/components/modal_variants/common/metadata_content/metadata_content";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { MakeSignatureRawCodeBlockContainer } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block_container";
import styles from "./ethereum_arbitrary_signature_content.module.scss";

interface EthereumArbitrarySignatureContentProps {
  payload: EthereumArbitrarySignPayload;
}

export const EthereumArbitrarySignatureContent: FC<
  EthereumArbitrarySignatureContentProps
> = ({ payload }) => {
  const [isViewRawData, setIsViewRawData] = useState(false);

  const message = (() => {
    const message = payload.data.message;
    if (typeof message === "string") {
      if (message.startsWith("0x")) {
        return hexToString(message as `0x${string}`);
      }

      return message;
    }

    const rawMessage = message.raw;
    if (typeof rawMessage === "string") {
      return hexToString(rawMessage);
    }

    return bytesToString(rawMessage);
  })();

  return (
    <div>
      <MetadataContent
        origin={payload.origin}
        chainInfo={payload.chain_info}
        signer={payload.signer}
      />
      <Spacing height={28} />
      <div className={styles.messageHeader}>
        <Typography size="sm" color="secondary" weight="semibold">
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
      {isViewRawData ? (
        <MakeSignatureRawCodeBlockContainer>
          <MakeSignatureRawCodeBlock
            code={message}
            className={styles.noMinHeight}
          />
        </MakeSignatureRawCodeBlockContainer>
      ) : (
        <div className={styles.dataContainer}>
          <Typography
            size="sm"
            color="tertiary"
            weight="medium"
            className={styles.data}
          >
            {message}
          </Typography>
        </div>
      )}
    </div>
  );
};
