import type { WalletState } from "@/shared/message-types";

// In-memory state for the service worker
let walletState: WalletState = {
  isConnected: false,
  evmAddress: null,
  svmPublicKey: null,
  cosmosPublicKey: null,
};

// Pending requests waiting for oko_attached responses
const pendingRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

export function getWalletState(): WalletState {
  return { ...walletState };
}

export function updateWalletState(updates: Partial<WalletState>): WalletState {
  walletState = { ...walletState, ...updates };

  console.log("[oko-extension] State updated:", walletState);

  // Persist to chrome.storage.local
  chrome.storage.local.set({ walletState }).then(() => {
    console.log("[oko-extension] State saved to storage");
  }).catch((err) => {
    console.error("[oko-extension] Failed to save state:", err);
  });

  return getWalletState();
}

export function resetWalletState(): void {
  walletState = {
    isConnected: false,
    evmAddress: null,
    svmPublicKey: null,
    cosmosPublicKey: null,
  };
}

export function addPendingRequest(
  id: string,
  resolve: (value: unknown) => void,
  reject: (reason: unknown) => void,
  timeoutMs = 300000 // 5 minutes default timeout
): void {
  const timeout = setTimeout(() => {
    pendingRequests.delete(id);
    reject(new Error("Request timeout"));
  }, timeoutMs);

  pendingRequests.set(id, { resolve, reject, timeout });
}

export function resolvePendingRequest(id: string, data: unknown): boolean {
  const pending = pendingRequests.get(id);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingRequests.delete(id);
    pending.resolve(data);
    return true;
  }
  return false;
}

export function rejectPendingRequest(id: string, error: unknown): boolean {
  const pending = pendingRequests.get(id);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingRequests.delete(id);
    pending.reject(error);
    return true;
  }
  return false;
}

export function hasPendingRequest(id: string): boolean {
  return pendingRequests.has(id);
}
