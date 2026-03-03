export interface ExportedKeys {
  secp256k1: string;
  ed25519: string;
}

const MSG_REQUEST = "__oko_request_export_keys__";
const MSG_RESPONSE = "__oko_export_keys_response__";
const CLEANUP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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

// Respond to key requests from display iframes via postMessage.
// BroadcastChannel is NOT used because third-party storage partitioning
// blocks it when the attached iframe is embedded in a different-site parent.
window.addEventListener("message", (event: MessageEvent) => {
  if (
    event.origin === window.location.origin &&
    event.data?.type === MSG_REQUEST &&
    storedKeys &&
    event.source
  ) {
    (event.source as Window).postMessage(
      { type: MSG_RESPONSE, keys: storedKeys },
      event.origin,
    );
  }
});

export function setExportedKeys(keys: ExportedKeys): void {
  storedKeys = keys;
  startCleanupTimer();
}

export function getExportedKeys(): ExportedKeys | null {
  return storedKeys;
}

/**
 * Request keys from the hidden iframe via postMessage through parent frames.
 * Used by the visible display iframe to fetch keys stored in the hidden iframe.
 */
export function requestExportedKeys(): Promise<ExportedKeys | null> {
  return new Promise((resolve) => {
    const selfOrigin = window.location.origin;

    const timeout = setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(null);
    }, 2000);

    const handler = (event: MessageEvent) => {
      if (
        event.origin === selfOrigin &&
        event.data?.type === MSG_RESPONSE
      ) {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve(event.data.keys);
      }
    };
    window.addEventListener("message", handler);

    // Send request to sibling iframes via window.parent.frames
    try {
      const len = window.parent.length;
      for (let i = 0; i < len; i++) {
        try {
          window.parent[i].postMessage(
            { type: MSG_REQUEST },
            selfOrigin,
          );
        } catch {
          // Skip inaccessible frames
        }
      }
    } catch {
      // window.parent might not be accessible (e.g., top-level window)
    }
  });
}

export function clearExportedKeys(): void {
  storedKeys = null;
  clearCleanupTimer();
}
