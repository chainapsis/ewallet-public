export interface ExportedKeys {
  secp256k1: string;
  ed25519: string;
}

let storedKeys: ExportedKeys | null = null;

export function setExportedKeys(keys: ExportedKeys): void {
  storedKeys = keys;
}

export function getExportedKeys(): ExportedKeys | null {
  return storedKeys;
}

export function clearExportedKeys(): void {
  storedKeys = null;
}
