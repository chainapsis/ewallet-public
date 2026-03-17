import type { CurveType } from "@oko-wallet/oko-types/crypto";

import { postLog } from "@oko-wallet-attached/requests/logging";

export interface ExportedKeys {
  secp256k1: string;
  ed25519: string;
}

const CLEANUP_TIMEOUT_MS = 30 * 1000; // 30 seconds (must exceed dashboard's 20s iframe load timeout)
const IN_FLIGHT_TIMEOUT_MS = 5 * 1000; // unlock key after 5s if ACK never arrives
const REQUEST_KEY_MSG = "oko_export_request_key";
const RESPONSE_KEY_MSG = "oko_export_key";
const ACK_KEY_MSG = "oko_export_ack_key";
const CLEAR_KEYS_MSG = "oko_export_clear_keys";

let storedKeys: ExportedKeys | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

// Per-key in-flight lock: key is sent but not yet ACK'd
const inFlight: Record<string, ReturnType<typeof setTimeout> | null> = {
  secp256k1: null,
  ed25519: null,
};

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
    // Clear any in-flight locks
    for (const kt of Object.keys(inFlight)) {
      if (inFlight[kt]) {
        clearTimeout(inFlight[kt]);
        inFlight[kt] = null;
      }
    }
  }, CLEANUP_TIMEOUT_MS);
}

function lockKey(keyType: CurveType): void {
  inFlight[keyType] = setTimeout(() => {
    // ACK never arrived — unlock so retries can succeed
    inFlight[keyType] = null;
  }, IN_FLIGHT_TIMEOUT_MS);
}

function isKeyLocked(keyType: CurveType): boolean {
  return inFlight[keyType] !== null;
}

function confirmKey(keyType: CurveType): void {
  if (inFlight[keyType]) {
    clearTimeout(inFlight[keyType]);
    inFlight[keyType] = null;
  }
  if (storedKeys) {
    storedKeys[keyType] = "";
    clearIfEmpty();
  }
}

// Respond to key requests, ACKs, and clear signals from other same-origin contexts
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
    if (
      storedKeys &&
      keyType in storedKeys &&
      storedKeys[keyType] &&
      !isKeyLocked(keyType)
    ) {
      lockKey(keyType);
      const responder = event.source as Window | null;
      responder?.postMessage(
        { type: RESPONSE_KEY_MSG, key_type: keyType, key: storedKeys[keyType] },
        event.origin,
      );
    } else if (window.location.pathname === "/") {
      postLog({
        level: "error",
        message: `export_key_store: REQUEST received but no key for ${keyType} (locked=${isKeyLocked(keyType)})`,
        error: {
          name: "ExportKeyStoreError",
          message: `storedKeys missing or locked key_type=${keyType}`,
        },
      });
    }
  } else if (data.type === ACK_KEY_MSG) {
    const keyType = data.key_type as CurveType;
    confirmKey(keyType);
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

/** One-shot read: returns the key and removes it from the store. */
export function consumeExportedKey(keyType: CurveType): string | null {
  if (!storedKeys || !storedKeys[keyType]) {
    return null;
  }
  const value = storedKeys[keyType];
  storedKeys[keyType] = "";
  clearIfEmpty();
  return value;
}

/**
 * Send an ACK to all sibling frames so the holder clears the key.
 */
function sendAck(keyType: CurveType): void {
  const selfOrigin = window.location.origin;
  try {
    const parentWin = window.parent;
    if (parentWin && parentWin !== window) {
      const frames = parentWin.frames;
      for (let i = 0; i < frames.length; i += 1) {
        try {
          frames[i].postMessage(
            { type: ACK_KEY_MSG, key_type: keyType },
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
}

/**
 * Request a single key from another same-origin context via postMessage.
 * Used by the visible iframe to fetch a key stored in the hidden iframe.
 * Sends an ACK on successful receipt so the holder can clear the key.
 */
export function requestExportedKey(keyType: CurveType): Promise<string | null> {
  const local = consumeExportedKey(keyType);
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
        const key = data.key ?? null;
        if (key) {
          sendAck(keyType);
        }
        resolve(key);
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
