import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { EthereumTxSignPayload } from "@oko-wallet/oko-sdk-core";
import { type FC, type ReactNode, useState } from "react";
import type { RpcTransactionRequest } from "viem";

import { Actions } from "./actions/actions";
import type { RenderContext } from "./actions/types";
import styles from "./ethereum_tx_summary.module.scss";
import { useEthereumTxActions } from "./hooks/use_ethereum_tx_actions";
import { useTrackTxSummaryView } from "@oko-wallet-attached/analytics/events";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { MakeSignatureRawCodeBlockContainer } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block_container";

export interface EthereumTxSummaryProps {
  payload: EthereumTxSignPayload;
  simulatedTransaction: RpcTransactionRequest | null;
}

export const EthereumTxSummary: FC<EthereumTxSummaryProps> = ({
  payload,
  simulatedTransaction,
}) => {
  const { actions, chain, isLoading, error } = useEthereumTxActions(payload);

  const [isRawView, setIsRawView] = useState(false);

  const rawTx = simulatedTransaction ?? payload.data.transaction;

  useTrackTxSummaryView({
    hostOrigin: payload.origin,
    chainType: "eth",
    chainId: payload.chain_info.chain_id,
    actions,
  });

  function handleToggleView() {
    setIsRawView((prev) => !prev);
  }

  let content: ReactNode | null = null;

  if (isRawView) {
    content = (
      <MakeSignatureRawCodeBlockContainer className={styles.rawSurface}>
        <MakeSignatureRawCodeBlock code={JSON.stringify(rawTx, null, 2)} />
      </MakeSignatureRawCodeBlockContainer>
    );
  } else {
    const context: RenderContext = {
      isLoading: isLoading,
      error: error ?? undefined,
      chain: chain,
    };

    content = <Actions actions={actions} context={context} />;
  }

  return (
    <div className={styles.txSummaryContainer}>
      <div className={styles.txSummaryHeader}>
        <Typography color="secondary" size="sm" weight="semibold">
          Transaction Summary
        </Typography>
        <div className={styles.txSummaryHeaderRight} onClick={handleToggleView}>
          <Typography color="tertiary" size="xs" weight="medium">
            {isRawView ? "Smart View" : "Raw View"}
          </Typography>
          <ChevronRightIcon
            className={styles.txSummaryHeaderRightIcon}
            color="var(--fg-tertiary)"
          />
        </div>
      </div>
      {content}
    </div>
  );
};
