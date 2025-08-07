import type {
  EWalletMsgShowModal,
  MakeCosmosSigData,
} from "@keplr-ewallet/ewallet-sdk-core";

import type { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

export async function showModal(
  this: CosmosEWallet,
  data: MakeCosmosSigData,
): Promise<"approve" | "reject"> {
  const showModalMsg: EWalletMsgShowModal = {
    target: "keplr_ewallet_attached",
    msg_type: "show_modal",
    payload: {
      modal_type: "make_signature",
      data,
    },
  };

  const modalResult = await this.eWallet.showModal(showModalMsg);

  await this.eWallet.hideModal();

  if (!modalResult.approved) {
    return "reject";
  }

  return "approve";
}
