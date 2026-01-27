import { OKO_ATTACHED_URL } from "@/shared/constants";
import {
  updateWalletState,
  addPendingRequest,
  resolvePendingRequest,
  rejectPendingRequest,
} from "./state";

// Track the oko_attached window
let okoAttachedWindowId: number | null = null;

/**
 * Get extension origin for host_origin parameter
 */
function getExtensionOrigin(): string {
  return chrome.runtime.getURL("").slice(0, -1); // Remove trailing slash
}

/**
 * Close the oko_attached/sign popup window
 */
export async function closeOkoAttachedWindow(): Promise<void> {
  if (okoAttachedWindowId !== null) {
    try {
      await chrome.windows.remove(okoAttachedWindowId);
      console.log("[oko-bridge] Popup window closed");
    } catch {
      // Window already closed
    }
    okoAttachedWindowId = null;
  }
}

/**
 * Set the oko_attached window ID (for tracking windows created elsewhere)
 */
export function setOkoAttachedWindowId(windowId: number | null): void {
  okoAttachedWindowId = windowId;
}

/**
 * Open oko_attached in a popup window
 */
export async function openOkoAttached(path = ""): Promise<chrome.windows.Window> {
  // Build URL with host_origin parameter so oko_attached can find the api_key
  const baseUrl = new URL(OKO_ATTACHED_URL);
  baseUrl.searchParams.set("host_origin", getExtensionOrigin());

  // Append additional path/query if provided
  const url = path ? `${baseUrl.toString()}${path.startsWith("?") ? "&" + path.slice(1) : path}` : baseUrl.toString();

  console.log("[oko-bridge] openOkoAttached URL:", url);

  // Check if we already have an oko_attached window open
  if (okoAttachedWindowId !== null) {
    try {
      const existingWindow = await chrome.windows.get(okoAttachedWindowId, { populate: true });
      if (existingWindow) {
        // Update URL and focus the existing window
        const tabId = existingWindow.tabs?.[0]?.id;
        if (tabId) {
          await chrome.tabs.update(tabId, { url });
        }
        await chrome.windows.update(okoAttachedWindowId, { focused: true });
        return existingWindow;
      }
    } catch {
      // Window no longer exists
      okoAttachedWindowId = null;
    }
  }

  // Create a new popup window
  const window = await chrome.windows.create({
    url,
    type: "popup",
    width: 420,
    height: 700,
    focused: true,
  });

  console.log("[oko-bridge] oko_attached window created:", window.id);
  okoAttachedWindowId = window.id ?? null;

  // Listen for window close
  if (window.id) {
    chrome.windows.onRemoved.addListener(function listener(windowId) {
      if (windowId === okoAttachedWindowId) {
        console.log("[oko-bridge] oko_attached window closed");
        okoAttachedWindowId = null;
        chrome.windows.onRemoved.removeListener(listener);
      }
    });
  }

  return window;
}

/**
 * Open sign.html page with SDK for signing
 * sign.html uses the SDK which ensures the same origin is used for both login and signing
 */
export async function openSignPopup(
  requestId: string,
  method: string,
  params: unknown
): Promise<chrome.windows.Window> {
  console.log("[oko-bridge] openSignPopup called", { requestId, method });

  // Build payload for the sign page
  const payload = {
    modal_type: `cosmos/${method}`,
    modal_id: crypto.randomUUID(),
    data: params,
  };

  const encodedPayload = encodeURIComponent(JSON.stringify(payload));

  // Open sign.html which uses SDK
  const signUrl = chrome.runtime.getURL(
    `sign.html?requestId=${requestId}&payload=${encodedPayload}`
  );

  console.log("[oko-bridge] Opening sign page:", signUrl);

  // Close existing window if any
  if (okoAttachedWindowId !== null) {
    try {
      await chrome.windows.remove(okoAttachedWindowId);
    } catch {
      // Window already closed
    }
    okoAttachedWindowId = null;
  }

  // Create popup window with sign page
  const window = await chrome.windows.create({
    url: signUrl,
    type: "popup",
    width: 420,
    height: 700,
    focused: true,
  });

  console.log("[oko-bridge] Sign page window created:", window.id);
  okoAttachedWindowId = window.id ?? null;

  // Listen for window close
  if (window.id) {
    chrome.windows.onRemoved.addListener(function listener(windowId) {
      if (windowId === okoAttachedWindowId) {
        console.log("[oko-bridge] Sign page window closed");
        okoAttachedWindowId = null;
        chrome.windows.onRemoved.removeListener(listener);
      }
    });
  }

  return window;
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
    openOkoAttached().then((window) => {
      const tabId = window.tabs?.[0]?.id;
      if (!tabId) {
        reject(new Error("Failed to open oko_attached window"));
        return;
      }

      // We need to inject a script to communicate with oko_attached
      // The oko_attached page will handle the message and respond back
      chrome.scripting.executeScript({
        target: { tabId },
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
          // Use reject for errors - this triggers the reject callback in OPEN_MODAL
          rejectPendingRequest(message.requestId, new Error(message.error));
        } else {
          // Pass payload directly - ExtensionOkoWallet.openModal will wrap it in Result
          resolvePendingRequest(message.requestId, message.payload);
        }
        // Close the popup window after signing is complete
        closeOkoAttachedWindow();
      }
      break;
    }

    default:
      console.debug("[oko-extension] Unknown message type:", message.type);
  }
}
