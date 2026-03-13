import type { MakeCosmosSigData } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";

import { MakeArbitrarySigModal } from "./arbitrary_sig/make_arbitrary_sig_modal";
import { MakeTxSigModal } from "./tx_sig/make_tx_sig_modal";

export const MakeSignatureCosmosModal: FC<MakeSignatureCosmosModalProps> = ({
  data,
  modalId,
  getIsAborted,
}) => {
  switch (data.sign_type) {
    case "tx": {
      return (
        <MakeTxSigModal
          data={data}
          modalId={modalId}
          getIsAborted={getIsAborted}
        />
      );
    }
    case "arbitrary": {
      return (
        <MakeArbitrarySigModal
          data={data}
          modalId={modalId}
          getIsAborted={getIsAborted}
        />
      );
    }
    default: {
      throw new Error("unreachable");
    }
  }
};

export interface MakeSignatureCosmosModalProps {
  data: MakeCosmosSigData;
  modalId: string;
  getIsAborted: () => boolean;
}
