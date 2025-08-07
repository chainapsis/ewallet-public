import { KeplrEWallet } from "@keplr-ewallet-sdk-core/keplr_ewallet";
import type {
  EWalletMsgShowModal,
  ModalResult,
} from "@keplr-ewallet-sdk-core/types";

// 5 minutes
const WAIT_TIME = 300000;

export async function showModal(
  this: KeplrEWallet,
  msg: EWalletMsgShowModal,
): Promise<ModalResult> {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Show modal timeout")),
      WAIT_TIME,
    );
  });

  try {
    this.iframe.style.display = "block";

    const showModalAck = await Promise.race([
      this.sendMsgToIframe(msg),
      timeout,
    ]);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (
      showModalAck.msg_type !== "show_modal_ack" ||
      !showModalAck.payload.success
    ) {
      throw new Error("Unreachable");
    }

    return showModalAck.payload.data;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (error instanceof Error && error.message === "Show modal timeout") {
      await this.hideModal();
      throw new Error("Show modal timeout");
    }

    throw error;
  }
}
