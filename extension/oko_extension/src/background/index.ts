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

  console.log("[oko-extension] Cosmos request:", request.method, request.params);

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
    console.log("[oko-extension] Received message:", message.type, message);

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

          case "OPEN_MODAL": {
            // Open sign.html with SDK for modal interaction (signing, etc.)
            // sign.html uses SDK which ensures same origin as login, so api_key is found
            const modalPayload = message.payload as {
              msg_type: string;
              payload: unknown;
              host_origin?: string;
            };
            const modalRequestId = message.id;

            console.log("[oko-bg] OPEN_MODAL request:", modalPayload.msg_type, modalRequestId);

            // Store the sendResponse to be called when sign.html responds
            addPendingRequest(
              modalRequestId,
              (result) => {
                console.log("[oko-bg] OPEN_MODAL resolved:", result);
                sendResponse({ id: modalRequestId, success: true, data: result });
              },
              (error) => {
                console.log("[oko-bg] OPEN_MODAL rejected:", error);
                sendResponse({
                  id: modalRequestId,
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
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

            console.log("[oko-bg] Opening sign.html for OPEN_MODAL:", signUrl);

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

            console.log("[oko-bg] INJECT_MODAL_SCRIPT:", modalReqId, "from tab:", sender.tab?.id, "modal_type:", modalPayload.modal_type);

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
                  console.log("[oko-modal-injected] Starting modal communication...", {
                    modalType,
                    modalId,
                    hostOrigin,
                    hasApiKey: !!apiKey,
                    apiKeyLength: apiKey?.length || 0
                  });

                  const STORAGE_KEY = "oko-wallet-app-2";

                  // Check if we need to set api_key and reload
                  // The "_oko_reloaded" flag in URL prevents infinite reload loop
                  const urlParams = new URLSearchParams(window.location.search);
                  const alreadyReloaded = urlParams.get("_oko_reloaded") === "true";

                  if (apiKey && !alreadyReloaded) {
                    try {
                      const existingData = localStorage.getItem(STORAGE_KEY);
                      let storeData = existingData ? JSON.parse(existingData) : { state: { perOrigin: {} }, version: 0 };

                      // Ensure the structure exists
                      if (!storeData.state) storeData.state = { perOrigin: {} };
                      if (!storeData.state.perOrigin) storeData.state.perOrigin = {};
                      if (!storeData.state.perOrigin[hostOrigin]) storeData.state.perOrigin[hostOrigin] = {};

                      // Always set/update the api_key to ensure it's current
                      storeData.state.perOrigin[hostOrigin].apiKey = apiKey;
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));

                      // Verify what we stored
                      const verifyData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
                      console.log("[oko-modal-injected] Stored api_key:", {
                        hostOrigin,
                        storedApiKeyLength: verifyData?.state?.perOrigin?.[hostOrigin]?.apiKey?.length || 0,
                        allOrigins: Object.keys(verifyData?.state?.perOrigin || {})
                      });
                      console.log("[oko-modal-injected] Reloading page to ensure zustand hydrates...");

                      // Add reload flag and reload so zustand picks up the api_key during hydration
                      urlParams.set("_oko_reloaded", "true");
                      window.location.search = urlParams.toString();
                      return; // Stop execution, page will reload
                    } catch (e) {
                      console.error("[oko-modal-injected] Failed to set api_key:", e);
                    }
                  } else if (alreadyReloaded) {
                    // Verify localStorage on reloaded page
                    try {
                      const rawData = localStorage.getItem(STORAGE_KEY);
                      console.log("[oko-modal-injected] Raw localStorage:", rawData?.substring(0, 500));

                      const verifyData = JSON.parse(rawData || "{}");
                      const storedApiKey = verifyData?.state?.perOrigin?.[hostOrigin]?.apiKey;
                      const allOrigins = Object.keys(verifyData?.state?.perOrigin || {});

                      console.log("[oko-modal-injected] Page reloaded, localStorage check:");
                      console.log("  hostOrigin we're looking for:", hostOrigin);
                      console.log("  origins in storage:", allOrigins);
                      console.log("  hasApiKeyInStorage:", !!storedApiKey);
                      console.log("  apiKeyLength:", storedApiKey?.length || 0);

                      // Check if origin exists but with different format
                      allOrigins.forEach(origin => {
                        const data = verifyData?.state?.perOrigin?.[origin];
                        console.log(`  origin "${origin}": apiKey=${!!data?.apiKey}, wallet=${!!data?.wallet}`);
                      });
                    } catch (e) {
                      console.error("[oko-modal-injected] Failed to verify localStorage:", e);
                    }
                  }

                  // Try to make oko_attached think it's in an iframe by mocking window.parent
                  // This is a hack to bypass the event.source check
                  const mockParent = {
                    postMessage: (data: unknown, targetOrigin: string, transfer?: Transferable[]) => {
                      const msg = data as { msg_type?: string; target?: string };
                      console.log("[oko-modal-injected] mockParent.postMessage called:", msg?.msg_type || msg?.target);

                      // Only forward actual modal responses, not init messages
                      if (msg?.msg_type === "open_modal_ack" || msg?.msg_type === "close_modal") {
                        window.postMessage({
                          __oko_extension_response__: true,
                          requestId: requestId,
                          data: data,
                        }, "*");
                      }

                      // If a port was transferred, respond on it
                      if (transfer && transfer.length > 0) {
                        const port = transfer[0] as MessagePort;
                        if (port && typeof port.postMessage === "function") {
                          // Acknowledge init messages
                          if (msg?.msg_type === "init") {
                            port.postMessage({
                              target: "oko_attached",
                              msg_type: "init_ack",
                              payload: { success: true, data: null },
                            });
                          }
                        }
                      }
                    },
                  };

                  // Check if we're actually in a top-level window (not iframe)
                  if (window === window.top) {
                    try {
                      // Try to override parent - this might not work due to security
                      Object.defineProperty(window, "parent", {
                        get: () => mockParent,
                        configurable: true,
                      });
                      console.log("[oko-modal-injected] window.parent overridden");
                    } catch (e) {
                      console.log("[oko-modal-injected] Could not override window.parent:", e);
                    }
                  }

                  // Wait for oko_attached to be ready, then send open_modal via MessageChannel
                  setTimeout(() => {
                    console.log("[oko-modal-injected] Sending open_modal via MessageChannel:", modalType);

                    // Create a MessageChannel for two-way communication (like the SDK does)
                    const channel = new MessageChannel();

                    channel.port1.onmessage = (event: MessageEvent) => {
                      const response = event.data;
                      console.log("[oko-modal-injected] Got response via MessageChannel:", response?.msg_type);

                      if (response?.msg_type === "open_modal_ack" || response?.msg_type === "close_modal") {
                        window.postMessage({
                          __oko_extension_response__: true,
                          requestId: requestId,
                          data: response,
                        }, "*");
                      }
                    };

                    // Fix: Override the origin in modalData to use hostOrigin (extension origin)
                    // This ensures oko_attached looks up api_key for the correct origin
                    let fixedModalData = modalData;
                    if (modalData && typeof modalData === "object") {
                      const data = modalData as Record<string, unknown>;
                      if (data.payload && typeof data.payload === "object") {
                        const payload = data.payload as Record<string, unknown>;
                        if (payload.origin) {
                          console.log("[oko-modal-injected] Fixing origin in payload from", payload.origin, "to", hostOrigin);
                          fixedModalData = {
                            ...data,
                            payload: {
                              ...payload,
                              origin: hostOrigin,
                            },
                          };
                        }
                      }
                    }

                    // Send the open_modal message with the port
                    window.postMessage({
                      source: "oko_sdk",
                      target: "oko_attached",
                      msg_type: "open_modal",
                      payload: {
                        modal_type: modalType,
                        modal_id: modalId,
                        data: fixedModalData,
                      },
                    }, "*", [channel.port2]);
                  }, 2000);

                  // Also listen for responses via regular postMessage (backup)
                  window.addEventListener("message", function handler(event) {
                    const msg = event.data;
                    if (msg?.target === "oko_sdk" && (msg?.msg_type === "open_modal_ack" || msg?.msg_type === "close_modal")) {
                      console.log("[oko-modal-injected] Got modal response via postMessage:", msg.msg_type);
                      window.postMessage({
                        __oko_extension_response__: true,
                        requestId: requestId,
                        data: msg,
                      }, "*");
                    }
                  });

                  console.log("[oko-modal-injected] Setup complete");
                },
                args: [hostOrigin, modalReqId, modalPayload.modal_type, modalPayload.modal_id || crypto.randomUUID(), modalPayload.data, apiKey],
              });

              console.log("[oko-bg] Script injected successfully");
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
            console.log("[oko-bg] SIGN_POPUP_RESULT:", signReqId, result);

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

          case "SIGN_PAGE_RESULT": {
            // Result from sign.html page
            const { requestId: signPageReqId, result: signPageResult } = message as {
              requestId: string;
              result: {
                success?: boolean;
                data?: unknown;
                error?: string;
                errorType?: string;
                message?: string;
              };
            };
            console.log("[oko-bg] SIGN_PAGE_RESULT:", signPageReqId, signPageResult);

            if (signPageResult?.success) {
              resolvePendingRequest(signPageReqId, signPageResult.data);
            } else {
              // Check if this is a session expired error
              if (signPageResult?.error === "session_expired") {
                // Open oko_attached for re-login
                console.log("[oko-bg] Session expired, opening login popup");
                openOkoAttached().then(() => {
                  console.log("[oko-bg] Login popup opened");
                }).catch((err) => {
                  console.error("[oko-bg] Failed to open login popup:", err);
                });

                // Still reject the request - user will need to retry after logging in
                rejectPendingRequest(
                  signPageReqId,
                  new Error(signPageResult?.message || "Session expired. Please sign in again and retry.")
                );
              } else {
                rejectPendingRequest(signPageReqId, new Error(signPageResult?.error || "Signing failed"));
              }
            }

            sendResponse({ id: signPageReqId, success: true, data: null });
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

            console.log("[oko-bg] RELAY_TO_MAIN_WORLD:", relayPayload.msg_type, "to tab", tabId, "frame", frameId);

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
                  console.log("[oko-main-world] Dispatching message:", msg?.msg_type);

                  // Keep the relay flag to prevent infinite loops
                  // oko_attached should ignore unknown fields

                  // Create and dispatch a MessageEvent
                  const event = new MessageEvent("message", {
                    data: msg,
                    origin: window.location.origin,
                    source: window.parent,
                  });

                  console.log("[oko-main-world] Event source is parent:", event.source === window.parent);

                  window.dispatchEvent(event);
                },
                args: [relayPayload],
              });

              console.log("[oko-bg] RELAY_TO_MAIN_WORLD: Script executed successfully");
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
