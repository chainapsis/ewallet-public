/**
 * Content Script - Bridge between page context and background service worker
 *
 * This script:
 * 1. Injects the injected.js script into the page context
 * 2. Forwards messages between page (window.postMessage) and background (chrome.runtime)
 */

import { MESSAGE_TARGET, OKO_ATTACHED_URL } from "@/shared/constants";

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
  if (isOkoAttachedPage() && message?.source === "oko-attached") {
    console.debug("[oko-content] Message from oko_attached:", message.type);

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

// Inject the script immediately
console.log("[oko-content] Injecting script...");
injectScript();
console.log("[oko-content] Content script loaded");
