import type { Result } from "@oko-wallet/stdlib-js";
import type {
  OkoWalletMsgOpenModal,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { OpenModalError } from "@oko-wallet/oko-sdk-core";
import type { WebViewBridge } from "../bridge/WebViewBridge";

const TEN_MINS = 60 * 10 * 1000;

export async function openModalRN(
  bridge: WebViewBridge,
  msg: OkoWalletMsgOpenModal,
  showModal: () => void,
  hideModal: () => void,
): Promise<Result<OpenModalAckPayload, OpenModalError>> {
  showModal();

  try {
    const ackPromise = bridge.sendMessage(msg);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Show modal timeout")), TEN_MINS);
    });

    const ack = await Promise.race([ackPromise, timeoutPromise]);

    if (ack.msg_type !== "open_modal_ack") {
      return {
        success: false,
        err: { type: "invalid_ack_type", received: ack.msg_type },
      };
    }

    return { success: true, data: ack.payload };
  } catch (error) {
    return { success: false, err: { type: "unknown_error", error } };
  } finally {
    hideModal();
  }
}
