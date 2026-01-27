import { OKO_ATTACHED_URL } from "@/shared/constants";
import {
  updateWalletState,
  addPendingRequest,
  resolvePendingRequest,
} from "./state";

// Track the oko_attached tab
let okoAttachedTabId: number | null = null;

/**
 * Open oko_attached in a new tab for sign-in or signing
 */
export async function openOkoAttached(path = ""): Promise<chrome.tabs.Tab> {
  const url = `${OKO_ATTACHED_URL}${path}`;

  // Check if we already have an oko_attached tab open
  if (okoAttachedTabId !== null) {
    try {
      const existingTab = await chrome.tabs.get(okoAttachedTabId);
      if (existingTab) {
        // Focus the existing tab
        await chrome.tabs.update(okoAttachedTabId, { active: true, url });
        await chrome.windows.update(existingTab.windowId!, { focused: true });
        return existingTab;
      }
    } catch {
      // Tab no longer exists
      okoAttachedTabId = null;
    }
  }

  // Create a new tab
  const tab = await chrome.tabs.create({ url, active: true });
  okoAttachedTabId = tab.id ?? null;

  // Listen for tab close
  if (tab.id) {
    chrome.tabs.onRemoved.addListener(function listener(tabId) {
      if (tabId === okoAttachedTabId) {
        okoAttachedTabId = null;
        chrome.tabs.onRemoved.removeListener(listener);
      }
    });
  }

  return tab;
}

/**
 * Send a message to oko_attached and wait for response
 * This opens oko_attached if needed and communicates via the page's postMessage API
 */
export async function sendToOkoAttached<T>(
  requestId: string,
  messageType: string,
  payload: unknown
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // Add to pending requests
    addPendingRequest(requestId, resolve as (v: unknown) => void, reject);

    // Open oko_attached
    openOkoAttached().then((tab) => {
      if (!tab.id) {
        reject(new Error("Failed to open oko_attached tab"));
        return;
      }

      // We need to inject a script to communicate with oko_attached
      // The oko_attached page will handle the message and respond back
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (msgType: string, msgPayload: unknown, reqId: string) => {
          // This runs in the context of oko_attached page
          window.postMessage(
            {
              source: "oko-extension",
              type: msgType,
              payload: msgPayload,
              requestId: reqId,
            },
            "*"
          );
        },
        args: [messageType, payload, requestId],
      }).catch(reject);
    }).catch(reject);
  });
}

/**
 * Handle messages from oko_attached (via content script)
 */
export function handleOkoAttachedMessage(message: {
  type: string;
  requestId: string;
  payload?: unknown;
  error?: string;
}): void {
  console.log("[oko-bg] handleOkoAttachedMessage:", JSON.stringify(message));

  switch (message.type) {
    case "STATE_UPDATE":
    case "WALLET_CONNECTED": {
      console.log("[oko-bg] Processing WALLET_CONNECTED, payload:", JSON.stringify(message.payload));

      const state = message.payload as {
        publicKey?: string;
        publicKeyEd25519?: string;
        evmAddress?: string;
        svmPublicKey?: string;
        cosmosPublicKey?: string;
      };

      console.log("[oko-bg] Parsed state:", JSON.stringify(state));

      const updates: Partial<{
        isConnected: boolean;
        evmAddress: string | null;
        svmPublicKey: string | null;
        cosmosPublicKey: string | null;
      }> = {};

      // Handle different payload formats
      if (state?.evmAddress) {
        updates.evmAddress = state.evmAddress;
        updates.isConnected = true;
      }
      if (state?.publicKey) {
        updates.evmAddress = state.publicKey;
        updates.cosmosPublicKey = state.publicKey;
        updates.isConnected = true;
      }
      if (state?.svmPublicKey || state?.publicKeyEd25519) {
        updates.svmPublicKey = state.svmPublicKey || state.publicKeyEd25519 || null;
        updates.isConnected = true;
      }
      if (state?.cosmosPublicKey) {
        updates.cosmosPublicKey = state.cosmosPublicKey;
        updates.isConnected = true;
      }

      console.log("[oko-bg] Updates to apply:", JSON.stringify(updates));

      if (Object.keys(updates).length > 0) {
        updateWalletState(updates);
        console.log("[oko-bg] Wallet state updated successfully");
      } else {
        console.log("[oko-bg] No updates to apply (empty)");
      }
      break;
    }

    case "SIGN_RESULT":
    case "CONNECT_RESULT": {
      if (message.requestId) {
        if (message.error) {
          resolvePendingRequest(message.requestId, {
            success: false,
            error: message.error,
          });
        } else {
          resolvePendingRequest(message.requestId, {
            success: true,
            data: message.payload,
          });
        }
      }
      break;
    }

    default:
      console.debug("[oko-extension] Unknown message type:", message.type);
  }
}
