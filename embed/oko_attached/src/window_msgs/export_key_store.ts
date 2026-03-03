export interface ExportedKeys {
  secp256k1: string;
  ed25519: string;
}

const CHANNEL_NAME = "__oko_export_keys__";
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

// Respond to key requests and clear signals from other same-origin contexts (visible iframe)
const bc = new BroadcastChannel(CHANNEL_NAME);
bc.onmessage = (event: MessageEvent) => {
  if (event.data?.type === "request_keys" && storedKeys) {
    bc.postMessage({ type: "keys", keys: storedKeys });
  } else if (event.data?.type === "clear_keys") {
    storedKeys = null;
    clearCleanupTimer();
  }
};

export function setExportedKeys(keys: ExportedKeys): void {
  storedKeys = keys;
  startCleanupTimer();
}

export function getExportedKeys(): ExportedKeys | null {
  return storedKeys;
}

/**
 * Request keys from another same-origin context via BroadcastChannel.
 * Used by the visible iframe to fetch keys stored in the hidden iframe.
 */
export function requestExportedKeys(): Promise<ExportedKeys | null> {
  return new Promise((resolve) => {
    const reqBc = new BroadcastChannel(CHANNEL_NAME);
    const timeout = setTimeout(() => {
      reqBc.close();
      resolve(null);
    }, 2000);

    reqBc.onmessage = (event: MessageEvent) => {
      if (event.data?.type === "keys") {
        clearTimeout(timeout);
        reqBc.close();
        resolve(event.data.keys);
      }
    };

    reqBc.postMessage({ type: "request_keys" });
  });
}

export function clearExportedKeys(): void {
  storedKeys = null;
  clearCleanupTimer();
}
