import type { WalletState } from "@/shared/message-types";
import { PendingRequestManager } from "@/shared/pending-request-manager";

// In-memory state for the service worker
let walletState: WalletState = {
  isConnected: false,
  evmAddress: null,
  svmPublicKey: null,
  cosmosPublicKey: null,
  evmChainId: "0x1",
};

// Pending requests waiting for oko_attached responses (5 min timeout)
const pendingRequests = new PendingRequestManager(300000);

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
    evmChainId: "0x1",
  };
}

export function addPendingRequest(
  id: string,
  resolve: (value: unknown) => void,
  reject: (reason: unknown) => void,
  timeoutMs?: number
): void {
  pendingRequests.add(id, resolve, reject, timeoutMs);
}

export function resolvePendingRequest(id: string, data: unknown): boolean {
  return pendingRequests.resolve(id, data);
}

export function rejectPendingRequest(id: string, error: unknown): boolean {
  return pendingRequests.reject(id, error);
}

export function hasPendingRequest(id: string): boolean {
  return pendingRequests.has(id);
}
