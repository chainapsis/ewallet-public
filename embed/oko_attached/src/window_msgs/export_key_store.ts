import type { CurveType } from "@oko-wallet/oko-types/crypto";

import { postLog } from "@oko-wallet-attached/requests/logging";

export interface ExportedKeys {
  secp256k1: string;
  ed25519: string;
}

const CLEANUP_TIMEOUT_MS = 15 * 1000; // 15 seconds (safety net; keys are cleared on first read)
const REQUEST_KEY_MSG = "oko_export_request_key";
const RESPONSE_KEY_MSG = "oko_export_key";
const CLEAR_KEYS_MSG = "oko_export_clear_keys";

let storedKeys: ExportedKeys | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function clearCleanupTimer(): void {
  if (cleanupTimer !== null) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
}

function clearIfEmpty(): void {
  if (storedKeys && !storedKeys.secp256k1 && !storedKeys.ed25519) {
    storedKeys = null;
    clearCleanupTimer();
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
  if (data.type === REQUEST_KEY_MSG) {
    const keyType = data.key_type as CurveType;
    if (storedKeys && keyType in storedKeys && storedKeys[keyType]) {
      const value = storedKeys[keyType];
      storedKeys[keyType] = "";
      clearIfEmpty();
      const responder = event.source as Window | null;
      responder?.postMessage(
        { type: RESPONSE_KEY_MSG, key_type: keyType, key: value },
        event.origin,
      );
    } else if (window.location.pathname === "/") {
      postLog({
        level: "error",
        message: `export_key_store: REQUEST received but no key for ${keyType}`,
        error: {
          name: "ExportKeyStoreError",
          message: `storedKeys missing key_type=${keyType}`,
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

export function getExportedKey(keyType: CurveType): string | null {
  if (!storedKeys || !storedKeys[keyType]) {
    return null;
  }
  const value = storedKeys[keyType];
  storedKeys[keyType] = "";
  clearIfEmpty();
  return value;
}

/**
 * Request a single key from another same-origin context via postMessage.
 * Used by the visible iframe to fetch a key stored in the hidden iframe.
 */
export function requestExportedKey(keyType: CurveType): Promise<string | null> {
  const local = getExportedKey(keyType);
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
      if (data?.type === RESPONSE_KEY_MSG && data.key_type === keyType) {
        cleanup();
        resolve(data.key ?? null);
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
            frames[i].postMessage(
              { type: REQUEST_KEY_MSG, key_type: keyType },
              selfOrigin,
            );
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
