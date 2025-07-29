import type {
  EWalletMsg,
  MakeCosmosSigData,
} from "@keplr-ewallet/ewallet-sdk-core";

import type { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

export async function showModal(
  this: CosmosEWallet,
  data: MakeCosmosSigData,
): Promise<"approve" | "reject"> {
  const showModalMsg: EWalletMsg = {
    msg_type: "show_modal",
    payload: {
      modal_type: "make_signature",
      data,
    },
  };

  const openModalAck = await this.eWallet.showModal(showModalMsg);

  if (openModalAck.msg_type !== "show_modal_ack") {
    await this.eWallet.hideModal();
    throw new Error("Can't receive show_modal_ack from ewallet");
  }

  await this.eWallet.hideModal();

  if (openModalAck.payload === "reject") {
    return "reject";
  }

  return "approve";
}
