export interface ExportedKeys {
  secp256k1: string;
  ed25519: string;
}

const CHANNEL_NAME = "__oko_export_keys__";

let storedKeys: ExportedKeys | null = null;

// Respond to key requests and clear signals from other same-origin contexts (visible iframe)
const bc = new BroadcastChannel(CHANNEL_NAME);
bc.onmessage = (event: MessageEvent) => {
  if (event.data?.type === "request_keys" && storedKeys) {
    bc.postMessage({ type: "keys", keys: storedKeys });
  } else if (event.data?.type === "clear_keys") {
    storedKeys = null;
  }
};

export function setExportedKeys(keys: ExportedKeys): void {
  storedKeys = keys;
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
        // Signal the hidden iframe to clear keys from memory
        reqBc.postMessage({ type: "clear_keys" });
        reqBc.close();
        resolve(event.data.keys);
      }
    };

    reqBc.postMessage({ type: "request_keys" });
  });
}

export function clearExportedKeys(): void {
  storedKeys = null;
}
