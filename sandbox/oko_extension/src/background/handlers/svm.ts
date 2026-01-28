/**
 * SVM (Solana) Request Handler
 */

import type { ExtensionResponse, SvmRequest } from "@/shared/message-types";
import { getWalletState, updateWalletState, addPendingRequest } from "../state";
import { openOkoAttached, openSignPopup } from "../oko-bridge";
import { v4 as uuidv4 } from "uuid";

/**
 * Handle Solana requests
 */
export async function handleSvmRequest(
  request: SvmRequest,
  sendResponse: (response: ExtensionResponse) => void
): Promise<void> {
  const requestId = uuidv4();
  const state = getWalletState();

  console.debug("[oko-extension] SVM request:", request.method, request.params);

  switch (request.method) {
    case "connect":
      if (state.isConnected && state.svmPublicKey) {
        sendResponse({
          id: requestId,
          success: true,
          data: { publicKey: state.svmPublicKey },
        });
        return;
      }

      addPendingRequest(
        requestId,
        (result) => sendResponse({ id: requestId, success: true, data: result }),
        (error) =>
          sendResponse({
            id: requestId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
      );
      await openOkoAttached();
      return;

    case "disconnect":
      updateWalletState({
        isConnected: false,
        svmPublicKey: null,
      });
      sendResponse({ id: requestId, success: true, data: null });
      return;

    case "signMessage":
    case "signTransaction":
    case "signAllTransactions":
    case "signAndSendTransaction":
      if (!state.isConnected || !state.svmPublicKey) {
        sendResponse({
          id: requestId,
          success: false,
          error: "Wallet not connected",
        });
        return;
      }

      addPendingRequest(
        requestId,
        (result) => sendResponse({ id: requestId, success: true, data: result }),
        (error) =>
          sendResponse({
            id: requestId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
      );
      await openSignPopup(requestId, request.method, request.params);
      return;

    default:
      sendResponse({
        id: requestId,
        success: false,
        error: `Method ${request.method} not supported`,
      });
  }
}
