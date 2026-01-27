/**
 * Oko Wallet Extension - Background Service Worker
 *
 * Handles message passing between content scripts and oko_attached.
 * All wallet operations (signing, key management) are delegated to oko_attached.
 */

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
import { openOkoAttached, openSignPopup, handleOkoAttachedMessage, setOkoAttachedWindowId } from "./oko-bridge";
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

      // Open popup window for signing (uses SDK iframe)
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

      await openSignPopup(requestId, request.method, request.params);
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

/**
 * Handle Cosmos requests
 */
async function handleCosmosRequest(
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
      await openSignPopup(requestId, request.method, request.params);
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
            const currentState = getWalletState();

            if (currentState.isConnected) {
              sendResponse({ id: message.id, success: true, data: currentState });
            } else {
              // If not connected in memory, check storage (handles race condition)
              chrome.storage.local.get(["walletState"], (result) => {
                if (result.walletState?.isConnected) {
                  updateWalletState(result.walletState);
                  sendResponse({ id: message.id, success: true, data: result.walletState });
                } else {
                  sendResponse({ id: message.id, success: true, data: currentState });
                }
              });
            }
            break;
          }

          case "OPEN_OKO_ATTACHED":
            await openOkoAttached((message.payload as { url?: string })?.url);
            sendResponse({ id: message.id, success: true, data: null });
            break;

          case "OPEN_MODAL": {
            // Open sign.html with SDK for modal interaction (signing, etc.)
            // sign.html uses SDK which ensures same origin as login, so api_key is found
            const modalPayload = message.payload as {
              msg_type: string;
              payload: unknown;
              host_origin?: string;
            };
            const modalRequestId = message.id;

            // Store the sendResponse to be called when sign.html responds
            addPendingRequest(
              modalRequestId,
              (result) => sendResponse({ id: modalRequestId, success: true, data: result }),
              (error) => sendResponse({
                id: modalRequestId,
                success: false,
                error: error instanceof Error ? error.message : String(error),
              })
            );

            // Build payload for sign.html
            // Extract modal_type and data from the nested payload structure
            const innerPayload = modalPayload.payload as { modal_type?: string; modal_id?: string; data?: unknown } | undefined;
            const signPayload = {
              modal_type: innerPayload?.modal_type || 'eth/make_signature',
              modal_id: innerPayload?.modal_id || crypto.randomUUID(),
              data: innerPayload?.data || modalPayload.payload,
            };
            const encodedPayload = encodeURIComponent(JSON.stringify(signPayload));
            const signUrl = chrome.runtime.getURL(
              `sign.html?requestId=${modalRequestId}&payload=${encodedPayload}`
            );

            const modalWindow = await chrome.windows.create({
              url: signUrl,
              type: "popup",
              width: 420,
              height: 700,
              focused: true,
            });

            // Track the window ID so it can be closed after signing
            if (modalWindow.id) {
              setOkoAttachedWindowId(modalWindow.id);
            }

            // Note: sendResponse is NOT called here - it will be called when sign.html responds
            // via SIGN_PAGE_RESULT
            break;
          }

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

          case "INJECT_MODAL_SCRIPT": {
            // Inject modal script into oko_attached using chrome.scripting (bypasses CSP)
            const { hostOrigin, requestId: modalReqId, modalPayload, apiKey } = message.payload as {
              hostOrigin: string;
              requestId: string;
              modalPayload: { modal_type: string; modal_id?: string; data: unknown };
              apiKey?: string;
            };

            console.debug("[oko-bg] INJECT_MODAL_SCRIPT:", modalPayload.modal_type);

            // Use sender's tab directly instead of querying
            const tabId = sender.tab?.id;
            if (!tabId) {
              console.error("[oko-bg] No sender tab found");
              sendResponse({ id: message.id, success: false, error: "No sender tab found" });
              break;
            }

            try {
              // Inject script into MAIN world
              await chrome.scripting.executeScript({
                target: { tabId },
                world: "MAIN",
                func: (hostOrigin: string, requestId: string, modalType: string, modalId: string, modalData: unknown, apiKey: string | undefined) => {
                  const STORAGE_KEY = "oko-wallet-app-2";
                  const urlParams = new URLSearchParams(window.location.search);
                  const alreadyReloaded = urlParams.get("_oko_reloaded") === "true";

                  // Set api_key in localStorage and reload if needed
                  if (apiKey && !alreadyReloaded) {
                    try {
                      const existingData = localStorage.getItem(STORAGE_KEY);
                      const storeData = existingData ? JSON.parse(existingData) : { state: { perOrigin: {} }, version: 0 };

                      if (!storeData.state) storeData.state = { perOrigin: {} };
                      if (!storeData.state.perOrigin) storeData.state.perOrigin = {};
                      if (!storeData.state.perOrigin[hostOrigin]) storeData.state.perOrigin[hostOrigin] = {};

                      storeData.state.perOrigin[hostOrigin].apiKey = apiKey;
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));

                      // Reload so zustand picks up the api_key during hydration
                      urlParams.set("_oko_reloaded", "true");
                      window.location.search = urlParams.toString();
                      return;
                    } catch (e) {
                      console.error("[oko-modal] Failed to set api_key:", e);
                    }
                  }

                  // Mock window.parent for top-level window
                  const mockParent = {
                    postMessage: (data: unknown, _targetOrigin: string, transfer?: Transferable[]) => {
                      const msg = data as { msg_type?: string };

                      if (msg?.msg_type === "open_modal_ack" || msg?.msg_type === "close_modal") {
                        window.postMessage({ __oko_extension_response__: true, requestId, data }, "*");
                      }

                      // Acknowledge init messages via transferred port
                      if (transfer?.[0] && msg?.msg_type === "init") {
                        (transfer[0] as MessagePort).postMessage({
                          target: "oko_attached",
                          msg_type: "init_ack",
                          payload: { success: true, data: null },
                        });
                      }
                    },
                  };

                  if (window === window.top) {
                    try {
                      Object.defineProperty(window, "parent", { get: () => mockParent, configurable: true });
                    } catch { /* ignore */ }
                  }

                  // Wait for oko_attached to be ready, then send open_modal via MessageChannel
                  setTimeout(() => {
                    const channel = new MessageChannel();

                    channel.port1.onmessage = (event: MessageEvent) => {
                      const response = event.data;
                      if (response?.msg_type === "open_modal_ack" || response?.msg_type === "close_modal") {
                        window.postMessage({ __oko_extension_response__: true, requestId, data: response }, "*");
                      }
                    };

                    // Fix origin in modalData to use hostOrigin (extension origin)
                    let fixedModalData = modalData;
                    if (modalData && typeof modalData === "object") {
                      const data = modalData as Record<string, unknown>;
                      if (data.payload && typeof data.payload === "object") {
                        const payload = data.payload as Record<string, unknown>;
                        if (payload.origin) {
                          fixedModalData = { ...data, payload: { ...payload, origin: hostOrigin } };
                        }
                      }
                    }

                    window.postMessage({
                      source: "oko_sdk",
                      target: "oko_attached",
                      msg_type: "open_modal",
                      payload: { modal_type: modalType, modal_id: modalId, data: fixedModalData },
                    }, "*", [channel.port2]);
                  }, 2000);

                  // Backup: listen for responses via regular postMessage
                  window.addEventListener("message", (event) => {
                    const msg = event.data;
                    if (msg?.target === "oko_sdk" && (msg?.msg_type === "open_modal_ack" || msg?.msg_type === "close_modal")) {
                      window.postMessage({ __oko_extension_response__: true, requestId, data: msg }, "*");
                    }
                  });
                },
                args: [hostOrigin, modalReqId, modalPayload.modal_type, modalPayload.modal_id || crypto.randomUUID(), modalPayload.data, apiKey],
              });

              sendResponse({ id: message.id, success: true, data: null });
            } catch (error) {
              console.error("[oko-bg] Script injection failed:", error);
              sendResponse({ id: message.id, success: false, error: String(error) });
            }
            break;
          }

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

          case "SIGN_POPUP_RESULT": {
            // Result from sign popup window
            const { requestId: signReqId, result } = message as {
              requestId: string;
              result: { success?: boolean; data?: unknown; error?: string } | unknown;
            };
            console.debug("[oko-bg] SIGN_POPUP_RESULT:", signReqId);

            // Handle the result
            const resultObj = result as { success?: boolean; data?: unknown; error?: string; msg_type?: string; payload?: unknown };

            if (resultObj?.msg_type === "open_modal_ack") {
              // Result from SDK openModal
              const payload = resultObj.payload as { type?: string; error?: string } | unknown;
              if ((payload as { type?: string })?.type === "error") {
                rejectPendingRequest(signReqId, new Error((payload as { error?: string })?.error || "Signing failed"));
              } else {
                resolvePendingRequest(signReqId, payload);
              }
            } else if (resultObj?.success === false) {
              rejectPendingRequest(signReqId, new Error(resultObj.error || "Signing failed"));
            } else if (resultObj?.success === true) {
              resolvePendingRequest(signReqId, resultObj.data);
            } else {
              // Raw result
              resolvePendingRequest(signReqId, result);
            }

            sendResponse({ id: signReqId, success: true, data: null });
            break;
          }

          case "RELAY_TO_MAIN_WORLD": {
            // Relay message to MAIN world using chrome.scripting.executeScript
            // This bypasses CSP restrictions
            const relayPayload = message.payload as {
              source: string;
              target: string;
              msg_type: string;
              payload: unknown;
              requestId?: string;
            };

            const tabId = sender.tab?.id;
            const frameId = sender.frameId;

            if (!tabId) {
              console.error("[oko-bg] RELAY_TO_MAIN_WORLD: No sender tab");
              sendResponse({ id: message.id, success: false, error: "No sender tab" });
              break;
            }

            console.debug("[oko-bg] RELAY_TO_MAIN_WORLD:", relayPayload.msg_type);

            try {
              // Target the specific frame where the content script is running (the iframe)
              const target: chrome.scripting.InjectionTarget = frameId !== undefined
                ? { tabId, frameIds: [frameId] }
                : { tabId };

              await chrome.scripting.executeScript({
                target,
                world: "MAIN",
                func: (msgData: unknown) => {
                  const msg = msgData as { msg_type?: string; __oko_relayed__?: boolean };
                  const event = new MessageEvent("message", {
                    data: msg,
                    origin: window.location.origin,
                    source: window.parent,
                  });
                  window.dispatchEvent(event);
                },
                args: [relayPayload],
              });

              sendResponse({ id: message.id, success: true, data: null });
            } catch (error) {
              console.error("[oko-bg] RELAY_TO_MAIN_WORLD: Script execution failed:", error);
              sendResponse({ id: message.id, success: false, error: String(error) });
            }
            break;
          }

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
