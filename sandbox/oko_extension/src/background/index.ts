/**
 * Oko Wallet Extension - Background Service Worker
 *
 * Routes messages from content scripts to appropriate handlers.
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
import {
  openOkoAttached,
  handleOkoAttachedMessage,
  setOkoAttachedWindowId,
} from "./oko-bridge";
import {
  handleEvmRequest,
  handleSvmRequest,
  handleCosmosRequest,
  resolveConnectionRequests,
} from "./handlers";
import { modalInjectScript, relayToMainWorldScript } from "./scripts/modal-inject";

console.log("[oko-extension] Background service worker started");

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(
  (message: ProviderMessage, sender, sendResponse) => {
    console.debug("[oko-extension] Received message:", message.type);

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

          case "GET_STATE":
            handleGetState(message.id, sendResponse);
            break;

          case "OPEN_OKO_ATTACHED":
            await openOkoAttached((message.payload as { url?: string })?.url);
            sendResponse({ id: message.id, success: true, data: null });
            break;

          case "OPEN_SIGNIN_WINDOW":
            await handleOpenSigninWindow();
            sendResponse({ id: message.id, success: true, data: null });
            break;

          case "OPEN_MODAL":
            await handleOpenModal(message.id, message.payload, sendResponse);
            break;

          case "DISCONNECT":
            handleDisconnect(message.id, sendResponse);
            break;

          case "INJECT_MODAL_SCRIPT":
            await handleInjectModalScript(message, sender, sendResponse);
            break;

          case "OKO_ATTACHED_MESSAGE":
            handleOkoAttachedMessageWrapper(message, sendResponse);
            break;

          case "SIGN_POPUP_RESULT":
            handleSignPopupResult(message, sendResponse);
            break;

          case "RELAY_TO_MAIN_WORLD":
            await handleRelayToMainWorld(message, sender, sendResponse);
            break;

          default: {
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

    return true; // Async response
  }
);

// ============== Message Handlers ==============

function handleGetState(
  messageId: string,
  sendResponse: (response: ExtensionResponse) => void
): void {
  const currentState = getWalletState();

  if (currentState.isConnected) {
    sendResponse({ id: messageId, success: true, data: currentState });
  } else {
    chrome.storage.local.get(["walletState"], (result) => {
      if (result.walletState?.isConnected) {
        updateWalletState(result.walletState);
        sendResponse({ id: messageId, success: true, data: result.walletState });
      } else {
        sendResponse({ id: messageId, success: true, data: currentState });
      }
    });
  }
}

async function handleOpenSigninWindow(): Promise<void> {
  const signinUrl = chrome.runtime.getURL("popup.html?mode=signin");
  await chrome.windows.create({
    url: signinUrl,
    type: "popup",
    width: 420,
    height: 700,
    focused: true,
  });
}

async function handleOpenModal(
  messageId: string,
  payload: unknown,
  sendResponse: (response: ExtensionResponse) => void
): Promise<void> {
  const modalPayload = payload as {
    msg_type: string;
    payload: unknown;
    host_origin?: string;
  };

  addPendingRequest(
    messageId,
    (result) => sendResponse({ id: messageId, success: true, data: result }),
    (error) =>
      sendResponse({
        id: messageId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
  );

  const innerPayload = modalPayload.payload as
    | { modal_type?: string; modal_id?: string; data?: unknown }
    | undefined;
  const signPayload = {
    modal_type: innerPayload?.modal_type || "eth/make_signature",
    modal_id: innerPayload?.modal_id || crypto.randomUUID(),
    data: innerPayload?.data || modalPayload.payload,
  };
  const encodedPayload = encodeURIComponent(JSON.stringify(signPayload));
  const signUrl = chrome.runtime.getURL(
    `sign.html?requestId=${messageId}&payload=${encodedPayload}`
  );

  const modalWindow = await chrome.windows.create({
    url: signUrl,
    type: "popup",
    width: 420,
    height: 700,
    focused: true,
  });

  if (modalWindow.id) {
    setOkoAttachedWindowId(modalWindow.id);
  }
}

function handleDisconnect(
  messageId: string,
  sendResponse: (response: ExtensionResponse) => void
): void {
  updateWalletState({
    isConnected: false,
    evmAddress: null,
    svmPublicKey: null,
    cosmosPublicKey: null,
  });
  sendResponse({ id: messageId, success: true, data: null });
}

async function handleInjectModalScript(
  message: ProviderMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionResponse) => void
): Promise<void> {
  const {
    hostOrigin,
    requestId,
    modalPayload,
    apiKey,
  } = message.payload as {
    hostOrigin: string;
    requestId: string;
    modalPayload: { modal_type: string; modal_id?: string; data: unknown };
    apiKey?: string;
  };

  console.debug("[oko-bg] INJECT_MODAL_SCRIPT:", modalPayload.modal_type);

  const tabId = sender.tab?.id;
  if (!tabId) {
    console.error("[oko-bg] No sender tab found");
    sendResponse({ id: message.id, success: false, error: "No sender tab found" });
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: modalInjectScript,
      args: [
        hostOrigin,
        requestId,
        modalPayload.modal_type,
        modalPayload.modal_id || crypto.randomUUID(),
        modalPayload.data,
        apiKey,
      ],
    });

    sendResponse({ id: message.id, success: true, data: null });
  } catch (error) {
    console.error("[oko-bg] Script injection failed:", error);
    sendResponse({ id: message.id, success: false, error: String(error) });
  }
}

function handleOkoAttachedMessageWrapper(
  message: ProviderMessage,
  sendResponse: (response: ExtensionResponse) => void
): void {
  handleOkoAttachedMessage(
    message.payload as {
      type: string;
      requestId: string;
      payload?: unknown;
      error?: string;
    }
  );

  // Check if any EVM requests were waiting for connection
  resolveConnectionRequests();

  sendResponse({ id: message.id, success: true, data: null });
}

function handleSignPopupResult(
  message: ProviderMessage,
  sendResponse: (response: ExtensionResponse) => void
): void {
  const payload = (message as { payload: { requestId: string; result: unknown } }).payload;
  const { requestId, result } = payload;
  console.debug("[oko-bg] SIGN_POPUP_RESULT:", requestId);

  const resultObj = result as {
    success?: boolean;
    data?: unknown;
    error?: string;
    msg_type?: string;
    payload?: unknown;
  };

  if (resultObj?.msg_type === "open_modal_ack") {
    const innerPayload = resultObj.payload as { type?: string; error?: string } | unknown;
    if ((innerPayload as { type?: string })?.type === "error") {
      rejectPendingRequest(
        requestId,
        new Error((innerPayload as { error?: string })?.error || "Signing failed")
      );
    } else {
      resolvePendingRequest(requestId, innerPayload);
    }
  } else if (resultObj?.success === false) {
    rejectPendingRequest(requestId, new Error(resultObj.error || "Signing failed"));
  } else if (resultObj?.success === true) {
    resolvePendingRequest(requestId, resultObj.data);
  } else {
    resolvePendingRequest(requestId, result);
  }

  sendResponse({ id: message.id, success: true, data: null });
}

async function handleRelayToMainWorld(
  message: ProviderMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionResponse) => void
): Promise<void> {
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
    return;
  }

  console.debug("[oko-bg] RELAY_TO_MAIN_WORLD:", relayPayload.msg_type);

  try {
    const target: chrome.scripting.InjectionTarget =
      frameId !== undefined ? { tabId, frameIds: [frameId] } : { tabId };

    await chrome.scripting.executeScript({
      target,
      world: "MAIN",
      func: relayToMainWorldScript,
      args: [relayPayload],
    });

    sendResponse({ id: message.id, success: true, data: null });
  } catch (error) {
    console.error("[oko-bg] RELAY_TO_MAIN_WORLD: Script execution failed:", error);
    sendResponse({ id: message.id, success: false, error: String(error) });
  }
}

// ============== Initialization ==============

chrome.storage.local.get(["walletState"], (result) => {
  if (result.walletState) {
    updateWalletState(result.walletState);
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.walletState) {
    console.debug("[oko-extension] State updated in storage");
  }
});
