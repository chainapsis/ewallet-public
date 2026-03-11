import { postLog } from "@oko-wallet-attached/requests/logging";

export interface ExportedKeys {
  secp256k1: string;
  ed25519: string;
}

const CLEANUP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_KEYS_MSG = "oko_export_request_keys";
const RESPONSE_KEYS_MSG = "oko_export_keys";
const CLEAR_KEYS_MSG = "oko_export_clear_keys";

let storedKeys: ExportedKeys | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function clearCleanupTimer(): void {
  if (cleanupTimer !== null) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
}

function startCleanupTimer(): void {
  clearCleanupTimer();
  cleanupTimer = setTimeout(() => {
    storedKeys = null;
    cleanupTimer = null;
  }, CLEANUP_TIMEOUT_MS);
}

// Respond to key requests and clear signals from other same-origin contexts (visible iframe)
function handleWindowMessage(event: MessageEvent): void {
  if (event.origin !== window.location.origin) {
    return;
  }
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }
  if (data.type === REQUEST_KEYS_MSG) {
    if (storedKeys) {
      const responder = event.source as Window | null;
      const keysToSend = storedKeys;
      storedKeys = null;
      clearCleanupTimer();
      responder?.postMessage(
        { type: RESPONSE_KEYS_MSG, keys: keysToSend },
        event.origin,
      );
    } else if (window.location.pathname === "/") {
      // Only log in the hidden iframe context — display iframes receiving
      // sibling requests without keys is expected behavior
      postLog({
        level: "error",
        message: "export_key_store: REQUEST received but no keys stored",
        error: {
          name: "ExportKeyStoreError",
          message: "storedKeys is null when REQUEST_KEYS_MSG received",
        },
      });
    }
  } else if (data.type === CLEAR_KEYS_MSG) {
    storedKeys = null;
    clearCleanupTimer();
  }
}

window.addEventListener("message", handleWindowMessage);

export function setExportedKeys(keys: ExportedKeys): void {
  storedKeys = keys;
  startCleanupTimer();
}

export function getExportedKeys(): ExportedKeys | null {
  return storedKeys;
}

/**
 * Request keys from another same-origin context via postMessage.
 * Used by the visible iframe to fetch keys stored in the hidden iframe.
 */
export function requestExportedKeys(): Promise<ExportedKeys | null> {
  const local = getExportedKeys();
  if (local) {
    return Promise.resolve(local);
  }

  return new Promise((resolve) => {
    const selfOrigin = window.location.origin;

    const handleResponse = (event: MessageEvent) => {
      if (event.origin !== selfOrigin) {
        return;
      }
      const data = event.data;
      if (data?.type === RESPONSE_KEYS_MSG) {
        cleanup();
        resolve(data.keys ?? null);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 2000);

    function cleanup() {
      clearTimeout(timeout);
      window.removeEventListener("message", handleResponse);
    }

    window.addEventListener("message", handleResponse);

    try {
      const parentWin = window.parent;
      if (parentWin && parentWin !== window) {
        const frames = parentWin.frames;
        for (let i = 0; i < frames.length; i += 1) {
          try {
            frames[i].postMessage({ type: REQUEST_KEYS_MSG }, selfOrigin);
          } catch {
            // cross-origin frame, skip
          }
        }
      }
    } catch {
      // frame iteration failed
    }
  });
}

export function clearExportedKeys(): void {
  storedKeys = null;
  clearCleanupTimer();
}
