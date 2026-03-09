/**
 * Key share sync for mobile OS-browser architecture.
 *
 * Encrypts sensitive key shares (keyshare_1, keyPackageEd25519, seedEd25519,
 * authToken) with a device_key using AES-256-GCM, then uploads/downloads
 * the encrypted blob via the proxy server.
 *
 * The device_key never leaves the app's Keychain/Keystore (expo-secure-store)
 * and is passed to the OS browser via URL fragment (not logged by server).
 */

import { useAppState } from "@oko-wallet-attached/store/app";

interface KeySharePayload {
  keyshare_1: string | null;
  keyPackageEd25519: string | null;
  seedEd25519: string | null;
  authToken: string | null;
  apiKey: string | null;
  wallet: unknown;
  ed25519Wallet: unknown;
}

/**
 * Read key shares from appState, encrypt with deviceKey, upload to server.
 * Called after keygen completes in the OS browser context.
 */
export async function uploadKeyShares(
  deviceKeyHex: string,
  hostOrigin: string,
): Promise<void> {
  const state = useAppState.getState();

  const payload: KeySharePayload = {
    keyshare_1: state.getKeyshare_1(hostOrigin),
    keyPackageEd25519: state.getKeyPackageEd25519(hostOrigin),
    seedEd25519: state.getSeedEd25519(hostOrigin),
    authToken: state.getAuthToken(hostOrigin),
    apiKey: state.getApiKey(hostOrigin),
    wallet: state.getWallet(hostOrigin),
    ed25519Wallet: state.getWalletEd25519(hostOrigin),
  };

  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await encryptAesGcm(deviceKeyHex, plaintext);

  const res = await fetch("/api/mobile/key-shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ encrypted_blob: encrypted }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Failed to upload key shares: ${(err as { error?: string }).error ?? res.status}`,
    );
  }
}

/**
 * Download encrypted key shares from server, decrypt with deviceKey,
 * restore into appState. Called in the OS browser signing page before signing.
 */
export async function downloadAndRestoreKeyShares(
  deviceKeyHex: string,
  hostOrigin: string,
): Promise<void> {
  const res = await fetch("/api/mobile/key-shares", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Failed to download key shares: ${(err as { error?: string }).error ?? res.status}`,
    );
  }

  const data = (await res.json()) as {
    success: boolean;
    encrypted_blob?: string;
  };
  if (!data.success || !data.encrypted_blob) {
    throw new Error("No encrypted key shares found on server");
  }

  const plaintext = await decryptAesGcm(deviceKeyHex, data.encrypted_blob);
  const payload: KeySharePayload = JSON.parse(
    new TextDecoder().decode(plaintext),
  );

  const state = useAppState.getState();

  if (payload.keyshare_1 !== null) {
    state.setKeyshare_1(hostOrigin, payload.keyshare_1);
  }
  if (payload.keyPackageEd25519 !== null) {
    state.setKeyPackageEd25519(hostOrigin, payload.keyPackageEd25519);
  }
  if (payload.seedEd25519 !== null) {
    state.setSeedEd25519(hostOrigin, payload.seedEd25519);
  }
  if (payload.authToken !== null) {
    state.setAuthToken(hostOrigin, payload.authToken);
  }
  if (payload.apiKey !== null && payload.apiKey !== undefined) {
    state.setApiKey(hostOrigin, payload.apiKey);
  }
  if (payload.wallet) {
    state.setWallet(
      hostOrigin,
      payload.wallet as Parameters<typeof state.setWallet>[1],
    );
  }
  if (payload.ed25519Wallet) {
    state.setWalletEd25519(
      hostOrigin,
      payload.ed25519Wallet as Parameters<typeof state.setWalletEd25519>[1],
    );
  }
}

// ── AES-256-GCM helpers ──

async function importKey(hexKey: string): Promise<CryptoKey> {
  const raw = hexToBytes(hexKey);
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptAesGcm(
  hexKey: string,
  plaintext: Uint8Array,
): Promise<string> {
  const key = await importKey(hexKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext.buffer as ArrayBuffer,
  );

  // Encode as: base64(iv + ciphertext)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptAesGcm(
  hexKey: string,
  encoded: string,
): Promise<Uint8Array> {
  const key = await importKey(hexKey);
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext.buffer as ArrayBuffer,
  );
  return new Uint8Array(plaintext);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
