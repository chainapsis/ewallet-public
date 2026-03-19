import type { StdSignDoc } from "@keplr-wallet/types";
import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { CosmosTxSignPayload } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";

import styles from "./cosmos_tx_summary.module.scss";
import { Messages } from "./msg/messages";
import { useCosmosTxSummary } from "./use_tx_summary";
import { useTrackTxSummaryView } from "@oko-wallet-attached/analytics/events";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { MakeSignatureRawCodeBlockContainer } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block_container";

export interface CosmosTxSummaryProps {
  payload: CosmosTxSignPayload;
  signDocJson: StdSignDoc;
  modalId: string;
}

export const CosmosTxSummary: FC<CosmosTxSummaryProps> = ({
  payload,
  signDocJson,
}) => {
  const useCosmosTxSummaryRes = useCosmosTxSummary({ payload, signDocJson });

  let content = null;
  if (useCosmosTxSummaryRes.success) {
    const { handleToggleView, msgs, isRawView, signDocString, isLoading } =
      useCosmosTxSummaryRes.data;

    // biome-ignore lint/correctness/useHookAtTopLevel: hook is called inside conditional block
    useTrackTxSummaryView({
      hostOrigin: payload.origin,
      chainType: "cosmos",
      chainId: payload.chain_info.chain_id,
      messages: msgs,
    });

    content = (
      <>
        <div className={styles.txSummaryHeader}>
          <Typography color="secondary" size="sm" weight="semibold">
            <Typography
              tagType="span"
              color="brand-secondary"
              size="sm"
              weight="semibold"
            >
              {msgs.length + " "}
            </Typography>
            Message(s)
          </Typography>
          <div
            className={styles.txSummaryHeaderRight}
            onClick={handleToggleView}
          >
            <Typography color="tertiary" size="xs" weight="medium">
              {isRawView ? "Smart View" : "Raw View"}
            </Typography>
            <ChevronRightIcon
              className={styles.txSummaryHeaderRightIcon}
              color="var(--fg-tertiary)"
            />
          </div>
        </div>
        {isRawView ? (
          <MakeSignatureRawCodeBlockContainer className={styles.rawSurface}>
            <MakeSignatureRawCodeBlock code={signDocString} />
          </MakeSignatureRawCodeBlockContainer>
        ) : (
          <Messages
            chainId={payload.chain_info.chain_id}
            messages={msgs}
            isLoading={isLoading}
          />
        )}
      </>
    );
  }

  return <div className={styles.txSummaryContainer}>{content}</div>;
};
