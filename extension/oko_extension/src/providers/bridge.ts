/**
 * Bridge for communication between page context (injected script) and background
 * Uses window.postMessage to communicate with content script
 */

import { MESSAGE_TARGET } from "@/shared/constants";
import type { ExtensionResponse } from "@/shared/message-types";

// Pending response handlers
const pendingResponses = new Map<
  string,
  {
    resolve: (value: ExtensionResponse) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

// Generate unique request ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Listen for responses from content script
if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const message = event.data;
    if (message?.target !== MESSAGE_TARGET.INJECTED) return;

    const pending = pendingResponses.get(message.id);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingResponses.delete(message.id);
      pending.resolve(message.payload as ExtensionResponse);
    }
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
    const id = generateId();

    const timeout = setTimeout(() => {
      pendingResponses.delete(id);
      reject(new Error(`Request timeout: ${type}`));
    }, timeoutMs);

    pendingResponses.set(id, {
      resolve: resolve as (value: ExtensionResponse) => void,
      reject,
      timeout,
    });

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

/**
 * Wait for a specific response by ID
 */
export function waitForResponse<T = unknown>(
  id: string,
  timeoutMs = 300000
): Promise<ExtensionResponse<T>> {
  return new Promise((resolve, reject) => {
    // Check if already resolved
    const timeout = setTimeout(() => {
      pendingResponses.delete(id);
      reject(new Error("Response timeout"));
    }, timeoutMs);

    pendingResponses.set(id, {
      resolve: resolve as (value: ExtensionResponse) => void,
      reject,
      timeout,
    });
  });
}
