import type { FC } from "react";
import type { MakeSvmSigData } from "@oko-wallet/oko-sdk-core";

import { MakeTxSigModal } from "./tx_sig/make_tx_sig_modal";
import { MakeAllTxSigModal } from "./all_tx_sig/make_all_tx_sig_modal";
import { MakeMessageSigModal } from "./message_sig/make_message_sig_modal";

export interface MakeSignatureSvmModalProps {
  getIsAborted: () => boolean;
  modalId: string;
  data: MakeSvmSigData;
}

export const MakeSignatureSvmModal: FC<MakeSignatureSvmModalProps> = ({
  getIsAborted,
  data,
  modalId,
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
    case "all_tx": {
      return (
        <MakeAllTxSigModal
          data={data}
          modalId={modalId}
          getIsAborted={getIsAborted}
        />
      );
    }
    case "message": {
      return (
        <MakeMessageSigModal
          data={data}
          modalId={modalId}
          getIsAborted={getIsAborted}
        />
      );
    }
  }
};
