import { OkoWallet, type OkoWalletInterface } from "@oko-wallet/oko-sdk-core";
import { OKO_ATTACHED_URL, OKO_API_KEY } from "@/shared/constants";

interface WalletState {
  isConnected: boolean;
  evmAddress: string | null;
  svmPublicKey: string | null;
  cosmosPublicKey: string | null;
}

// UI Elements
const loadingEl = document.getElementById("loading")!;
const signinViewEl = document.getElementById("signin-view")!;
const connectedViewEl = document.getElementById("connected-view")!;

// Sign-in button and status
const signinBtn = document.getElementById("signin-btn") as HTMLButtonElement;
const statusBadge = document.getElementById("status-badge")!;
const statusText = document.getElementById("status-text")!;

// Connected view elements
const disconnectBtn = document.getElementById("disconnect-btn")!;
const evmAccountEl = document.getElementById("evm-account")!;
const evmAddressEl = document.getElementById("evm-address")!;
const svmAccountEl = document.getElementById("svm-account")!;
const svmAddressEl = document.getElementById("svm-address")!;

// SDK instance (only used for sign-in)
let okoWallet: OkoWalletInterface | null = null;

// Sign-in status management
type SignInStatus = "idle" | "signing-in" | "success" | "error";

function setSignInStatus(status: SignInStatus, message?: string): void {
  statusBadge.classList.remove("hidden", "signing-in", "success", "error");

  if (status === "idle") {
    statusBadge.classList.add("hidden");
    signinBtn.disabled = false;
    signinBtn.innerHTML = "Sign in with Oko";
    return;
  }

  statusBadge.classList.add(status);

  switch (status) {
    case "signing-in":
      statusText.textContent = message || "Signing in...";
      signinBtn.disabled = true;
      signinBtn.innerHTML = '<span class="spinner"></span>Signing in...';
      break;
    case "success":
      statusText.textContent = message || "Sign-in successful!";
      signinBtn.disabled = false;
      signinBtn.innerHTML = "Sign in with Oko";
      break;
    case "error":
      statusText.textContent = message || "Sign-in failed";
      signinBtn.disabled = false;
      signinBtn.innerHTML = "Try again";
      break;
  }
}

// Truncate address for display
function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

// Show appropriate view based on state
function updateUI(state: WalletState): void {
  loadingEl.classList.add("hidden");

  if (state.isConnected && (state.evmAddress || state.svmPublicKey)) {
    signinViewEl.classList.add("hidden");
    connectedViewEl.classList.remove("hidden");

    // Show EVM address if available
    if (state.evmAddress) {
      evmAccountEl.classList.remove("hidden");
      evmAddressEl.textContent = truncateAddress(state.evmAddress);
    } else {
      evmAccountEl.classList.add("hidden");
    }

    // Show SVM address if available
    if (state.svmPublicKey) {
      svmAccountEl.classList.remove("hidden");
      svmAddressEl.textContent = truncateAddress(state.svmPublicKey);
    } else {
      svmAccountEl.classList.add("hidden");
    }
  } else {
    signinViewEl.classList.remove("hidden");
    connectedViewEl.classList.add("hidden");
  }
}

// Get current state from background storage
async function loadStateFromBackground(): Promise<WalletState> {
  console.log("[oko-popup] Loading state from background...");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_STATE",
      id: crypto.randomUUID(),
      payload: null,
    });

    console.log("[oko-popup] Background response:", response);

    if (response?.success && response.data?.isConnected) {
      return response.data as WalletState;
    }
  } catch (error) {
    console.error("[oko-popup] Failed to load state from background:", error);
  }

  return {
    isConnected: false,
    evmAddress: null,
    svmPublicKey: null,
    cosmosPublicKey: null,
  };
}

// Save state to background
async function saveStateToBackground(state: WalletState): Promise<void> {
  console.log("[oko-popup] Saving state to background:", JSON.stringify(state));

  try {
    const response = await chrome.runtime.sendMessage({
      type: "OKO_ATTACHED_MESSAGE",
      id: crypto.randomUUID(),
      payload: {
        type: "WALLET_CONNECTED",
        requestId: "",
        payload: {
          evmAddress: state.evmAddress,
          svmPublicKey: state.svmPublicKey,
          cosmosPublicKey: state.cosmosPublicKey,
        },
      },
    });
    console.log("[oko-popup] Save response:", response);

    // Verify it was saved
    const verifyResponse = await chrome.runtime.sendMessage({
      type: "GET_STATE",
      id: crypto.randomUUID(),
      payload: null,
    });
    console.log("[oko-popup] Verify saved state:", JSON.stringify(verifyResponse?.data));
  } catch (error) {
    console.error("[oko-popup] Failed to save state:", error);
  }
}

// Derive EVM address from public key
function deriveEvmAddress(publicKey: string): string {
  // For secp256k1 public key, we take a portion as placeholder
  // TODO: Implement proper keccak256 derivation
  return `0x${publicKey.slice(2, 42)}`;
}

// Initialize SDK for sign-in only
async function initSDKForSignIn(): Promise<boolean> {
  if (okoWallet) {
    return true;
  }

  console.log("[oko-popup] Initializing SDK for sign-in...");

  if (!OKO_API_KEY) {
    console.error("[oko-popup] API key not configured");
    return false;
  }

  const result = OkoWallet.init({
    api_key: OKO_API_KEY,
    sdk_endpoint: OKO_ATTACHED_URL,
  });

  if (!result.success) {
    console.error("[oko-popup] SDK init failed:", result.err);
    return false;
  }

  okoWallet = result.data;

  // Listen for account changes (fires after sign-in)
  okoWallet.on({
    type: "CORE__accountsChanged",
    handler: async (event) => {
      console.log("[oko-popup] CORE__accountsChanged:", event);

      try {
        const walletInfo = await okoWallet?.getWalletInfo();
        console.log("[oko-popup] Wallet info:", walletInfo);

        if (walletInfo?.publicKey) {
          const publicKey = walletInfo.publicKey;
          console.log("[oko-popup] Public key found:", publicKey);

          // Skip Ed25519 key - it's not implemented in oko_attached
          // and causes unhandled promise rejection
          const svmPublicKey: string | null = null;

          const state: WalletState = {
            isConnected: true,
            evmAddress: deriveEvmAddress(publicKey),
            svmPublicKey,
            cosmosPublicKey: publicKey,
          };

          console.log("[oko-popup] State to save:", JSON.stringify(state));

          // Save to background storage
          await saveStateToBackground(state);

          // Update UI
          console.log("[oko-popup] Updating UI...");
          updateUI(state);
          console.log("[oko-popup] Done!");
        }
      } catch (error) {
        console.error("[oko-popup] Error handling account change:", error);
      }
    },
  });

  // Wait for SDK initialization with timeout
  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), 10000);
    });
    await Promise.race([okoWallet.waitUntilInitialized, timeout]);
    console.log("[oko-popup] SDK ready for sign-in");
    return true;
  } catch (error) {
    console.error("[oko-popup] SDK init timeout:", error);
    return false;
  }
}

// Open sign-in modal
async function openSignIn(): Promise<void> {
  setSignInStatus("signing-in", "Preparing...");

  const sdkReady = await initSDKForSignIn();
  if (!sdkReady || !okoWallet) {
    setSignInStatus("error", "Failed to initialize");
    return;
  }

  setSignInStatus("signing-in", "Opening sign-in...");

  try {
    await okoWallet.openSignInModal();
    console.log("[oko-popup] Sign-in completed");
    setSignInStatus("success", "Welcome to Oko!");

    setTimeout(() => setSignInStatus("idle"), 2000);
  } catch (error) {
    console.error("[oko-popup] Sign-in failed:", error);
    const message = error instanceof Error ? error.message : "Sign-in failed";
    setSignInStatus("error", message === "Sign in cancelled" ? "Cancelled" : message);

    setTimeout(() => setSignInStatus("idle"), 3000);
  }
}

// Disconnect wallet
async function disconnect(): Promise<void> {
  try {
    // Sign out from SDK if initialized
    if (okoWallet) {
      try {
        await okoWallet.signOut();
      } catch {
        console.log("[oko-popup] SDK signOut failed (expected)");
      }
    }

    // Clear background storage
    await chrome.runtime.sendMessage({
      type: "DISCONNECT",
      id: crypto.randomUUID(),
      payload: null,
    });

    updateUI({
      isConnected: false,
      evmAddress: null,
      svmPublicKey: null,
      cosmosPublicKey: null,
    });

    console.log("[oko-popup] Disconnected");
  } catch (error) {
    console.error("[oko-popup] Disconnect failed:", error);
  }
}

// Event listeners
signinBtn.addEventListener("click", openSignIn);
disconnectBtn.addEventListener("click", disconnect);

// Initialize
(async () => {
  // Load state from background storage (source of truth)
  const state = await loadStateFromBackground();

  if (state.isConnected) {
    // Already connected - show connected view
    console.log("[oko-popup] Already connected, showing connected view");
    updateUI(state);
  } else {
    // Not connected - show sign-in view
    console.log("[oko-popup] Not connected, showing sign-in view");
    updateUI(state);
  }
})();
