import { type FC, type ReactNode, useState, useMemo } from "react";
import type { SvmMessageSignPayload } from "@oko-wallet/oko-sdk-core";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";

import styles from "../common/summary.module.scss";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { MakeSignatureRawCodeBlockContainer } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block_container";

export interface SvmMessageSummaryProps {
  payload: SvmMessageSignPayload;
}

export const SvmMessageSummary: FC<SvmMessageSummaryProps> = ({
  payload,
}) => {
  const [isRawView, setIsRawView] = useState(false);

  const { rawData, smartViewContent } = useMemo(() => {
    const msgData = payload.data;
    let decoded = "";

    try {
      const hex = msgData.message.startsWith("0x")
        ? msgData.message.slice(2)
        : msgData.message;
      const byteArray = new Uint8Array(hex.length / 2);
      for (let i = 0; i < byteArray.length; i++) {
        byteArray[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      decoded = new TextDecoder().decode(byteArray);
    } catch {
      decoded = msgData.message;
    }

    const displayText =
      decoded.length > 200 ? decoded.slice(0, 200) + "..." : decoded;

    const content: ReactNode = (
      <MakeSignatureRawCodeBlockContainer>
        <Typography
          color="tertiary"
          size="sm"
          weight="medium"
          style={{
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {displayText}
        </Typography>
      </MakeSignatureRawCodeBlockContainer>
    );

    return {
      rawData: JSON.stringify({ message: msgData.message }, null, 2),
      smartViewContent: content,
    };
  }, [payload.data]);

  function handleToggleView() {
    setIsRawView((prev) => !prev);
  }

  let content: ReactNode | null = null;

  if (isRawView) {
    content = (
      <MakeSignatureRawCodeBlockContainer>
        <MakeSignatureRawCodeBlock
          className={styles.codeBlock}
          code={rawData}
        />
      </MakeSignatureRawCodeBlockContainer>
    );
  } else {
    content = smartViewContent;
  }

  return (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryHeader}>
        <Typography color="secondary" size="sm" weight="semibold">
          Message
        </Typography>
        <div className={styles.summaryHeaderRight} onClick={handleToggleView}>
          <Typography color="tertiary" size="xs" weight="medium">
            {isRawView ? "Smart View" : "Raw View"}
          </Typography>
          <ChevronRightIcon className={styles.summaryHeaderRightIcon} />
        </div>
      </div>
      {content}
    </div>
  );
};
