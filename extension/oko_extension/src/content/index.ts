/**
 * Content Script - Bridge between page context and background service worker
 *
 * This script:
 * 1. Injects the injected.js script into the page context
 * 2. Forwards messages between page (window.postMessage) and background (chrome.runtime)
 */

import { MESSAGE_TARGET, OKO_ATTACHED_URL, OKO_API_KEY } from "@/shared/constants";

// Inject the provider script into the page context
function injectScript(): void {
  // First, inject a synchronous inline script to set up placeholders immediately
  // This ensures window.ethereum and window.keplr exist before any other scripts check for them
  const inlineScript = document.createElement("script");
  inlineScript.textContent = `
    // Placeholder objects - will be replaced by full providers
    if (!window.keplr) {
      window.keplr = { mode: 'extension', isOko: true, _placeholder: true };
    }
    if (!window.ethereum) {
      window.ethereum = { isMetaMask: true, isOko: true, _placeholder: true };
    }
  `;
  (document.head || document.documentElement).appendChild(inlineScript);
  inlineScript.remove();

  // Then load the full provider script
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");

  // Insert at the very beginning to run as early as possible
  const parent = document.head || document.documentElement;
  const firstChild = parent.firstChild;

  if (firstChild) {
    parent.insertBefore(script, firstChild);
  } else {
    parent.appendChild(script);
  }

  script.onload = () => script.remove();
}

// Check if we're on the oko_attached page
function isOkoAttachedPage(): boolean {
  return window.location.origin === OKO_ATTACHED_URL.replace(/\/$/, "");
}

// Handle modal requests on oko_attached page
async function handleOkoAttachedModal(): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search);
  const isModal = urlParams.get("modal") === "true";
  const requestId = urlParams.get("requestId");
  const encodedPayload = urlParams.get("payload");
  const hostOrigin = urlParams.get("host_origin") || chrome.runtime.getURL("").slice(0, -1);

  if (!isModal || !requestId || !encodedPayload) {
    return;
  }

  console.log("[oko-content] Modal request detected on oko_attached", { requestId });

  try {
    const payload = JSON.parse(decodeURIComponent(encodedPayload));
    console.log("[oko-content] Modal payload:", payload);

    // Request background to inject script using chrome.scripting.executeScript
    // This bypasses CSP restrictions
    await chrome.runtime.sendMessage({
      type: "INJECT_MODAL_SCRIPT",
      id: requestId,
      payload: {
        hostOrigin,
        requestId,
        modalPayload: payload,
        apiKey: OKO_API_KEY, // Pass api_key so it can be set in oko_attached's localStorage
      },
    });

    console.log("[oko-content] Requested background to inject modal script");
  } catch (error) {
    console.error("[oko-content] Failed to handle modal:", error);

    await chrome.runtime.sendMessage({
      type: "OKO_ATTACHED_MESSAGE",
      id: requestId,
      payload: {
        type: "SIGN_RESULT",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

// Listen for messages from the injected script (page context)
window.addEventListener("message", async (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  const message = event.data;

  // Messages from injected script to content script
  if (message?.target === MESSAGE_TARGET.CONTENT) {
    console.debug("[oko-content] Received from page:", message.type);

    try {
      // Forward to background service worker
      const response = await chrome.runtime.sendMessage({
        ...message,
        id: message.id,
      });

      // Send response back to the injected script
      window.postMessage(
        {
          target: MESSAGE_TARGET.INJECTED,
          id: message.id,
          type: `${message.type}_RESPONSE`,
          payload: response,
        },
        "*"
      );
    } catch (error) {
      console.error("[oko-content] Error forwarding message:", error);
      window.postMessage(
        {
          target: MESSAGE_TARGET.INJECTED,
          id: message.id,
          type: `${message.type}_RESPONSE`,
          payload: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        "*"
      );
    }
  }

  // Messages from oko_attached page to extension
  if (isOkoAttachedPage()) {
    // Handle responses from our injected modal script
    if (message?.__oko_extension_response__) {
      const msgType = message.data?.msg_type;
      console.log("[oko-content] Response from injected script:", msgType, message.requestId);

      // Only forward actual modal responses (open_modal_ack, close_modal), not init messages
      if (msgType === "open_modal_ack" || msgType === "close_modal") {
        try {
          await chrome.runtime.sendMessage({
            type: "OKO_ATTACHED_MESSAGE",
            id: message.requestId,
            payload: {
              type: "SIGN_RESULT",
              requestId: message.requestId,
              payload: message.data?.payload,
              error: message.data?.payload?.error,
            },
          });
          console.log("[oko-content] Modal response forwarded to background");
        } catch (error) {
          console.error("[oko-content] Error forwarding modal response:", error);
        }
      } else {
        console.log("[oko-content] Ignoring non-modal response:", msgType);
      }
      return;
    }

    // Handle messages with source "oko-attached" (from oko_attached internal)
    if (message?.source === "oko-attached") {
      console.log("[oko-content] Message from oko_attached:", message.type, message);

      try {
        await chrome.runtime.sendMessage({
          type: "OKO_ATTACHED_MESSAGE",
          id: message.requestId || crypto.randomUUID(),
          payload: message,
        });
      } catch (error) {
        console.error("[oko-content] Error sending oko_attached message:", error);
      }
    }

    // Handle messages with target "oko_sdk" (responses to our modal requests)
    if (message?.target === "oko_sdk") {
      console.log("[oko-content] Response from oko_attached to SDK:", message);

      // Get the request ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const requestId = urlParams.get("requestId");

      if (requestId) {
        try {
          await chrome.runtime.sendMessage({
            type: "OKO_ATTACHED_MESSAGE",
            id: requestId,
            payload: {
              type: message.msg_type === "open_modal_ack" ? "SIGN_RESULT" : message.msg_type,
              requestId,
              payload: message.payload,
              error: message.payload?.error,
            },
          });
          console.log("[oko-content] Modal response forwarded to background");
        } catch (error) {
          console.error("[oko-content] Error forwarding modal response:", error);
        }
      }
    }
  }
});

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.debug("[oko-content] Received from background:", message.type);

  // Forward to the page context
  window.postMessage(
    {
      target: MESSAGE_TARGET.INJECTED,
      ...message,
    },
    "*"
  );

  sendResponse({ received: true });
  return true;
});

// Inject the script immediately (only on non-oko_attached pages)
if (!isOkoAttachedPage()) {
  console.log("[oko-content] Injecting script...");
  injectScript();
} else {
  console.log("[oko-content] On oko_attached page...");

  // Check if we're loaded from extension's sign.html via URL parameter
  // This is more reliable than referrer which can be empty for cross-origin iframes
  const urlParams = new URLSearchParams(window.location.search);
  const isFromExtension = urlParams.get("oko_ext") === "true";

  console.log("[oko-content] isFromExtension:", isFromExtension);

  if (isFromExtension) {
    // Loaded from extension's sign.html
    // postMessage from sign.html can reach oko_attached directly
    // No relay needed - the SDK communication pattern works as-is
    console.log("[oko-content] In extension iframe, no relay needed (direct postMessage works)");
  } else {
    // Top-level page or non-extension iframe - handle modal URL params
    handleOkoAttachedModal();

    // Set up message relay for cases where CSP blocks inline scripts
    // This is for when oko_attached is opened directly (not in sign.html iframe)
    window.addEventListener("message", (event) => {
      const isFromParent = event.source === window.parent && event.source !== window;
      const message = event.data;

      // Skip if this message was already relayed (has the relay flag)
      if (message?.__oko_relayed__) {
        return;
      }

      if (isFromParent) {
        console.log("[oko-content] Message from parent:", message?.msg_type, message?.target, message?.source);

        if (message?.target === "oko_attached" && message?.source === "oko_sdk") {
          console.log("[oko-content] Relaying message via background:", message.msg_type);

          // Add relay flag to prevent infinite loops
          const messageWithFlag = { ...message, __oko_relayed__: true };

          // Request background to use chrome.scripting.executeScript to bypass CSP
          chrome.runtime.sendMessage({
            type: "RELAY_TO_MAIN_WORLD",
            id: crypto.randomUUID(),
            payload: messageWithFlag,
          }).catch((err) => {
            console.error("[oko-content] Failed to relay via background:", err);
          });
        }
      }
    });
  }
}
console.log("[oko-content] Content script loaded");
