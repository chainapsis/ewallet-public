/**
 * Bridge for communication between page context (injected script) and background
 * Uses window.postMessage to communicate with content script
 */

import { MESSAGE_TARGET } from "@/shared/constants";
import type { ExtensionResponse } from "@/shared/message-types";
import { PendingRequestManager, generateRequestId } from "@/shared/pending-request-manager";

// Pending response handlers (30 second timeout for provider requests)
const pendingResponses = new PendingRequestManager<ExtensionResponse>(30000);

// Listen for responses from content script
if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const message = event.data;
    if (message?.target !== MESSAGE_TARGET.INJECTED) return;

    pendingResponses.resolve(message.id, message.payload as ExtensionResponse);
  });
}

/**
 * Send a message to the background service worker via content script
 */
export function sendToBackground<T = unknown>(
  type: string,
  payload: unknown,
  timeoutMs = 30000
): Promise<ExtensionResponse<T>> {
  return new Promise((resolve, reject) => {
    const id = generateRequestId();

    pendingResponses.add(
      id,
      resolve as (value: ExtensionResponse) => void,
      reject,
      timeoutMs
    );

    window.postMessage(
      {
        target: MESSAGE_TARGET.CONTENT,
        id,
        type,
        payload,
      },
      "*"
    );
  });
}
