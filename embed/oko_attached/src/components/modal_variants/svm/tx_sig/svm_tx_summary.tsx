import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { SvmTxSignPayload } from "@oko-wallet/oko-sdk-core";
import { type FC, type ReactNode, useMemo, useState } from "react";

import styles from "../common/summary.module.scss";
import { Instructions } from "./msg/instructions";
import localStyles from "./svm_tx_summary.module.scss";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { MakeSignatureRawCodeBlockContainer } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block_container";
import { TxRow } from "@oko-wallet-attached/components/modal_variants/common/tx_row";
import { TxContainer } from "@oko-wallet-attached/components/modal_variants/eth/tx_sig/actions/common/tx_container";
import type { ParsedTransaction } from "@oko-wallet-attached/tx-parsers/svm";

export interface SvmTxSummaryProps {
  payload: SvmTxSignPayload;
  parsedTx: ParsedTransaction | null;
  parseError: string | null;
  isLoading: boolean;
}

export const SvmTxSummary: FC<SvmTxSummaryProps> = ({
  payload,
  parsedTx,
  parseError,
  isLoading,
}) => {
  const [isRawView, setIsRawView] = useState(false);

  const txData = payload.data;
  const chainId = payload.chain_id;

  const { rawData, smartViewContent } = useMemo(() => {
    let content: ReactNode;

    if (parseError) {
      content = (
        <TxContainer>
          <TxRow label="Error">
            <Typography color="primary" size="sm" weight="semibold">
              {parseError}
            </Typography>
          </TxRow>
        </TxContainer>
      );
    } else if (isLoading || !parsedTx) {
      content = (
        <TxContainer>
          <Skeleton width="100%" height="32px" />
        </TxContainer>
      );
    } else {
      content = (
        <Instructions instructions={parsedTx.instructions} chainId={chainId} />
      );
    }

    return {
      rawData: JSON.stringify(
        {
          serialized_transaction: txData.serialized_transaction,
          message_to_sign: txData.message_to_sign,
          is_versioned: txData.is_versioned,
        },
        null,
        2,
      ),
      smartViewContent: content,
    };
  }, [txData, parsedTx, parseError, isLoading, chainId]);

  function handleToggleView() {
    setIsRawView((prev) => !prev);
  }

  let content: ReactNode | null = null;

  if (isRawView) {
    content = (
      <MakeSignatureRawCodeBlockContainer className={styles.rawSurface}>
        <MakeSignatureRawCodeBlock code={rawData} />
      </MakeSignatureRawCodeBlockContainer>
    );
  } else {
    content = (
      <div className={localStyles.smartViewContent}>{smartViewContent}</div>
    );
  }

  return (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryHeader}>
        <Typography color="secondary" size="sm" weight="semibold">
          Transaction Summary
        </Typography>
        <div className={styles.summaryHeaderRight} onClick={handleToggleView}>
          <Typography color="tertiary" size="xs" weight="medium">
            {isRawView ? "Smart View" : "Raw View"}
          </Typography>
          <ChevronRightIcon
            className={styles.summaryHeaderRightIcon}
            color="var(--fg-tertiary)"
          />
        </div>
      </div>
      {content}
    </div>
  );
};
