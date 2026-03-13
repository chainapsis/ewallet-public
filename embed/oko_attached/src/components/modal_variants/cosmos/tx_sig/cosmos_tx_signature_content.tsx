import type { StdSignDoc } from "@keplr-wallet/types";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import type { CosmosTxSignPayload } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";

import { CosmosTxSummary } from "./cosmos_tx_summary";
import { MetadataContent } from "@oko-wallet-attached/components/modal_variants/common/metadata_content/metadata_content";

interface CosmosTxSignatureContentProps {
  payload: CosmosTxSignPayload;
  signDocJson: StdSignDoc;
  modalId: string;
}

export const CosmosTxSignatureContent: FC<CosmosTxSignatureContentProps> = ({
  payload,
  signDocJson,
  modalId,
}) => {
  return (
    <div>
      <MetadataContent
        origin={payload.origin}
        chainInfo={payload.chain_info}
        signer={payload.signer}
      />
      <Spacing height={28} />
      <CosmosTxSummary
        payload={payload}
        modalId={modalId}
        signDocJson={signDocJson}
      />
    </div>
  );
};
