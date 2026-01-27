/**
 * Oko Wallet Extension - Background Service Worker
 *
 * Handles message passing between content scripts and oko_attached.
 * All wallet operations (signing, key management) are delegated to oko_attached.
 */

import { OKO_ATTACHED_URL } from "@/shared/constants";
import type {
  ProviderMessage,
  ExtensionResponse,
  EvmRpcRequest,
  SvmRequest,
  CosmosRequest,
} from "@/shared/message-types";
import {
  getWalletState,
  updateWalletState,
  addPendingRequest,
  resolvePendingRequest,
  rejectPendingRequest,
} from "./state";
import { openOkoAttached, handleOkoAttachedMessage } from "./oko-bridge";
import { v4 as uuidv4 } from "uuid";

console.log("[oko-extension] Background service worker started");

// Track pending EVM RPC requests
const rpcRequestsWaitingForConnection = new Map<string, {
  sendResponse: (response: ExtensionResponse) => void;
  request: EvmRpcRequest;
}>();

/**
 * Handle EVM RPC requests
 */
async function handleEvmRequest(
  request: EvmRpcRequest,
  sendResponse: (response: ExtensionResponse) => void
): Promise<void> {
  const requestId = uuidv4();
  const state = getWalletState();

  console.debug("[oko-extension] EVM request:", request.method, request.params);

  switch (request.method) {
    case "eth_chainId":
      // Default to Ethereum mainnet for now
      sendResponse({ id: requestId, success: true, data: "0x1" });
      return;

    case "web3_clientVersion":
      sendResponse({
        id: requestId,
        success: true,
        data: "OkoWallet/0.1.0",
      });
      return;

    case "eth_accounts":
      sendResponse({
        id: requestId,
        success: true,
        data: state.evmAddress ? [state.evmAddress] : [],
      });
      return;

    case "eth_requestAccounts":
      if (state.isConnected && state.evmAddress) {
        sendResponse({
          id: requestId,
          success: true,
          data: [state.evmAddress],
        });
        return;
      }

      // Need to open oko_attached for sign-in
      rpcRequestsWaitingForConnection.set(requestId, { sendResponse, request });
      await openOkoAttached();
      // Response will be sent when oko_attached reports connection
      return;

    case "personal_sign":
    case "eth_signTypedData_v4":
    case "eth_sendTransaction":
    case "eth_signTransaction": {
      if (!state.isConnected || !state.evmAddress) {
        sendResponse({
          id: requestId,
          success: false,
          error: "Wallet not connected",
        });
        return;
      }

      // Open oko_attached for signing
      addPendingRequest(
        requestId,
        (result) => {
          sendResponse({
            id: requestId,
            success: true,
            data: result,
          });
        },
        (error) => {
          sendResponse({
            id: requestId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      );

      await openOkoAttached(`?sign=${request.method}&requestId=${requestId}`);
      // The content script in oko_attached will handle the signing and respond
      return;
    }

    case "wallet_switchEthereumChain":
    case "wallet_addEthereumChain":
      // For now, acknowledge but don't actually switch
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

/**
 * Handle Solana requests
 */
async function handleSvmRequest(
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

      // Open oko_attached for sign-in
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
      await openOkoAttached(`?sign=${request.method}&requestId=${requestId}`);
      return;

    default:
      sendResponse({
        id: requestId,
        success: false,
        error: `Method ${request.method} not supported`,
      });
  }
}

/**
 * Handle Cosmos requests
 */
async function handleCosmosRequest(
  request: CosmosRequest,
  sendResponse: (response: ExtensionResponse) => void
): Promise<void> {
  const requestId = uuidv4();
  const state = getWalletState();

  console.debug("[oko-extension] Cosmos request:", request.method, request.params);

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

      // Return key info
      sendResponse({
        id: requestId,
        success: true,
        data: {
          name: "Oko Wallet",
          algo: "secp256k1",
          pubKey: state.cosmosPublicKey,
          // Address will be derived by the calling app
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
      await openOkoAttached(`?sign=${request.method}&requestId=${requestId}`);
      return;

    case "experimentalSuggestChain":
      // Accept chain suggestions
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

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(
  (message: ProviderMessage, sender, sendResponse) => {
    console.debug("[oko-extension] Received message:", message.type);

    // Handle async responses
    (async () => {
      try {
        switch (message.type) {
          case "EVM_RPC_REQUEST":
            await handleEvmRequest(message.payload as EvmRpcRequest, sendResponse);
            break;

          case "SVM_REQUEST":
            await handleSvmRequest(message.payload as SvmRequest, sendResponse);
            break;

          case "COSMOS_REQUEST":
            await handleCosmosRequest(message.payload as CosmosRequest, sendResponse);
            break;

          case "GET_STATE": {
            console.log("[oko-bg] GET_STATE request");
            // Check in-memory state first
            const currentState = getWalletState();
            console.log("[oko-bg] In-memory state:", currentState);

            if (currentState.isConnected) {
              console.log("[oko-bg] Returning in-memory state (connected)");
              sendResponse({
                id: message.id,
                success: true,
                data: currentState,
              });
            } else {
              // If not connected in memory, check storage (handles race condition)
              console.log("[oko-bg] Checking storage...");
              chrome.storage.local.get(["walletState"], (result) => {
                console.log("[oko-bg] Storage state:", result.walletState);
                if (result.walletState?.isConnected) {
                  // Update in-memory state from storage
                  updateWalletState(result.walletState);
                  console.log("[oko-bg] Returning storage state (connected)");
                  sendResponse({
                    id: message.id,
                    success: true,
                    data: result.walletState,
                  });
                } else {
                  console.log("[oko-bg] Returning default state (not connected)");
                  sendResponse({
                    id: message.id,
                    success: true,
                    data: currentState,
                  });
                }
              });
            }
            break;
          }

          case "OPEN_OKO_ATTACHED":
            await openOkoAttached((message.payload as { url?: string })?.url);
            sendResponse({ id: message.id, success: true, data: null });
            break;

          case "DISCONNECT":
            // Reset wallet state (automatically saved to storage)
            updateWalletState({
              isConnected: false,
              evmAddress: null,
              svmPublicKey: null,
              cosmosPublicKey: null,
            });
            sendResponse({ id: message.id, success: true, data: null });
            break;

          case "OKO_ATTACHED_MESSAGE":
            // Message from oko_attached via content script
            handleOkoAttachedMessage(message.payload as {
              type: string;
              requestId: string;
              payload?: unknown;
              error?: string;
            });

            // Check if any EVM requests were waiting for connection
            const state = getWalletState();
            if (state.isConnected) {
              for (const [reqId, { sendResponse: respond, request }] of rpcRequestsWaitingForConnection) {
                if (request.method === "eth_requestAccounts" && state.evmAddress) {
                  respond({
                    id: reqId,
                    success: true,
                    data: [state.evmAddress],
                  });
                  rpcRequestsWaitingForConnection.delete(reqId);
                }
              }
            }

            sendResponse({ id: message.id, success: true, data: null });
            break;

          default: {
            // Exhaustive check - this should never happen if all message types are handled
            const _exhaustiveCheck: never = message;
            sendResponse({
              id: (message as ProviderMessage).id,
              success: false,
              error: `Unknown message type: ${(message as ProviderMessage).type}`,
            });
          }
        }
      } catch (error) {
        console.error("[oko-extension] Error handling message:", error);
        sendResponse({
          id: message.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    // Return true to indicate async response
    return true;
  }
);

// Initialize state from storage on startup
chrome.storage.local.get(["walletState"], (result) => {
  if (result.walletState) {
    updateWalletState(result.walletState);
  }
});

// Save state to storage when it changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.walletState) {
    console.debug("[oko-extension] State updated in storage");
  }
});
