import type {
  MakeCosmosSigData,
  OkoWalletMsgOpenModal,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import { v4 as uuidv4 } from "uuid";

import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";

export async function openModal(
  this: OkoCosmosWalletInterface,
  data: MakeCosmosSigData,
): Promise<OpenModalAckPayload> {
  const modal_id = uuidv4();

  const openModalMsg: OkoWalletMsgOpenModal = {
    target: "oko_attached",
    msg_type: "open_modal",
    payload: {
      modal_type: "cosmos/make_signature",
      modal_id,
      data,
    },
  };
  try {
    const modalResult = await this.okoWallet.openModal(openModalMsg);

    if (!modalResult.success) {
      throw new Error("modal result not success");
    }

    this.okoWallet.closeModal();

    return modalResult.data;
  } catch (err: any) {
    throw new Error(`Error getting modal response, err: ${err}`);
  }
}
