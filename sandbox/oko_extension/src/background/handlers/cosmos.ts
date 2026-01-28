/**
 * Cosmos Request Handler
 */

import type { ExtensionResponse, CosmosRequest } from "@/shared/message-types";
import { getWalletState, addPendingRequest } from "../state";
import { openOkoAttached, openSignPopup } from "../oko-bridge";
import { v4 as uuidv4 } from "uuid";

/**
 * Handle Cosmos requests
 */
export async function handleCosmosRequest(
  request: CosmosRequest,
  sendResponse: (response: ExtensionResponse) => void
): Promise<void> {
  const requestId = uuidv4();
  const state = getWalletState();

  console.debug("[oko-extension] Cosmos request:", request.method);

  switch (request.method) {
    case "enable":
      if (state.isConnected && state.cosmosPublicKey) {
        sendResponse({ id: requestId, success: true, data: null });
        return;
      }

      addPendingRequest(
        requestId,
        () => sendResponse({ id: requestId, success: true, data: null }),
        (error) =>
          sendResponse({
            id: requestId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
      );
      await openOkoAttached();
      return;

    case "getKey":
    case "getKeysSettled":
      if (!state.isConnected || !state.cosmosPublicKey) {
        sendResponse({
          id: requestId,
          success: false,
          error: "Wallet not connected",
        });
        return;
      }

      sendResponse({
        id: requestId,
        success: true,
        data: {
          name: "Oko Wallet",
          algo: "secp256k1",
          pubKey: state.cosmosPublicKey,
        },
      });
      return;

    case "signAmino":
    case "signDirect":
    case "signArbitrary":
    case "sendTx":
      if (!state.isConnected || !state.cosmosPublicKey) {
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

    case "experimentalSuggestChain":
      sendResponse({ id: requestId, success: true, data: null });
      return;

    default:
      sendResponse({
        id: requestId,
        success: false,
        error: `Method ${request.method} not supported`,
      });
  }
}
