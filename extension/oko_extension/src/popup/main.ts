import { OkoWallet, type OkoWalletInterface, type OkoWalletMsgOpenModal } from "@oko-wallet/oko-sdk-core";
import { OKO_ATTACHED_URL, OKO_API_KEY } from "@/shared/constants";

// Check if we're in sign mode (opened as a window for signing)
const urlParams = new URLSearchParams(window.location.search);
const signMode = urlParams.get("mode") === "sign";
const signRequestId = urlParams.get("requestId");
const signPayload = urlParams.get("payload");

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
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_STATE",
      id: crypto.randomUUID(),
      payload: null,
    });

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
  try {
    await chrome.runtime.sendMessage({
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
    handler: async () => {
      try {
        const walletInfo = await okoWallet?.getWalletInfo();

        if (walletInfo?.publicKey) {
          const publicKey = walletInfo.publicKey;

          // Skip Ed25519 key - it's not implemented in oko_attached
          // and causes unhandled promise rejection
          const svmPublicKey: string | null = null;

          const state: WalletState = {
            isConnected: true,
            evmAddress: deriveEvmAddress(publicKey),
            svmPublicKey,
            cosmosPublicKey: publicKey,
          };

          // Save to background storage
          await saveStateToBackground(state);

          // Update UI
          updateUI(state);
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
    setSignInStatus("success", "Welcome to Oko!");

    setTimeout(() => setSignInStatus("idle"), 2000);
  } catch (error) {
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
        // Expected to fail sometimes
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
  } catch (error) {
    console.error("[oko-popup] Disconnect failed:", error);
  }
}

// Sign mode elements
const signLoadingEl = document.getElementById("sign-loading");
const signLoadingTextEl = signLoadingEl?.querySelector(".text");

// Handle signing mode
async function handleSignMode(): Promise<void> {
  if (!signRequestId || !signPayload) {
    sendSignResult({ success: false, error: "Missing parameters" });
    return;
  }

  // Enable sign mode styling
  document.body.classList.add("sign-mode");
  signLoadingEl?.classList.remove("hidden");
  if (signLoadingTextEl) signLoadingTextEl.textContent = "Initializing...";

  // Initialize SDK
  const sdkReady = await initSDKForSignIn();

  if (!sdkReady || !okoWallet) {
    sendSignResult({ success: false, error: "SDK initialization failed" });
    return;
  }

  try {
    const payload = JSON.parse(decodeURIComponent(signPayload));

    if (signLoadingTextEl) signLoadingTextEl.textContent = "Opening signature request...";

    // Create open_modal message
    const openModalMsg: OkoWalletMsgOpenModal = {
      target: "oko_attached",
      msg_type: "open_modal",
      payload,
    };

    // Hide loading when modal opens (SDK will show its iframe)
    signLoadingEl?.classList.add("hidden");

    const result = await okoWallet.openModal(openModalMsg);

    if (result.success) {
      sendSignResult({
        target: "oko_sdk",
        msg_type: "open_modal_ack",
        payload: result.data,
      });
    } else {
      sendSignResult({
        target: "oko_sdk",
        msg_type: "open_modal_ack",
        payload: { type: "error", error: result.err },
      });
    }
  } catch (error) {
    console.error("[oko-popup] Sign error:", error);
    sendSignResult({ success: false, error: String(error) });
  }
}

// Send sign result back to background
function sendSignResult(result: unknown): void {
  chrome.runtime.sendMessage({
    type: "SIGN_POPUP_RESULT",
    requestId: signRequestId,
    result,
  });

  // Close the window after a short delay
  setTimeout(() => {
    window.close();
  }, 500);
}

// Event listeners
signinBtn.addEventListener("click", openSignIn);
disconnectBtn.addEventListener("click", disconnect);

// Initialize
(async () => {
  // Check if we're in sign mode
  if (signMode) {
    // Hide normal UI elements
    signinViewEl.classList.add("hidden");
    connectedViewEl.classList.add("hidden");
    loadingEl.classList.add("hidden");
    await handleSignMode();
    return;
  }

  // Normal popup mode - load state from background storage
  const state = await loadStateFromBackground();
  updateUI(state);
})();
