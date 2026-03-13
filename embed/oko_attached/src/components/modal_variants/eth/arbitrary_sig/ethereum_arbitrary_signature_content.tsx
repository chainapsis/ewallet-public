import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { EthereumArbitrarySignPayload } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";
import { bytesToString, hexToString } from "viem";

import styles from "./ethereum_arbitrary_signature_content.module.scss";
import { MetadataContent } from "@oko-wallet-attached/components/modal_variants/common/metadata_content/metadata_content";

interface EthereumArbitrarySignatureContentProps {
  payload: EthereumArbitrarySignPayload;
}

export const EthereumArbitrarySignatureContent: FC<
  EthereumArbitrarySignatureContentProps
> = ({ payload }) => {
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
      <Typography color="secondary" size="sm" weight="semibold">
        Message
      </Typography>
      <Spacing height={8} />
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
    </div>
  );
};
