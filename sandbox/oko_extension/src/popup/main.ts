import { OkoWallet, type OkoWalletInterface, type OkoWalletMsgOpenModal } from "@oko-wallet/oko-sdk-core";
import { OKO_ATTACHED_URL, OKO_API_KEY } from "@/shared/constants";

// Check if we're in special modes (opened as a window)
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode");
const signMode = mode === "sign";
const signinMode = mode === "signin";
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

// Sign-in button
const signinBtn = document.getElementById("signin-btn") as HTMLButtonElement;

// Connected view elements
const disconnectBtn = document.getElementById("disconnect-btn")!;
const evmAccountEl = document.getElementById("evm-account")!;
const evmAddressEl = document.getElementById("evm-address")!;
const svmAccountEl = document.getElementById("svm-account")!;
const svmAddressEl = document.getElementById("svm-address")!;

// SDK instance (only used for sign mode)
let okoWallet: OkoWalletInterface | null = null;

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

    // Show EVM address if available (full address)
    if (state.evmAddress) {
      evmAccountEl.classList.remove("hidden");
      evmAddressEl.textContent = state.evmAddress;
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

// Open sign-in via background (opens popup.html?mode=signin in separate window)
async function openSignIn(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({
      type: "OPEN_SIGNIN_WINDOW",
      id: crypto.randomUUID(),
      payload: null,
    });

    // Close popup - user will sign in via the new window
    window.close();
  } catch (error) {
    console.error("[oko-popup] Failed to open sign-in window:", error);
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

// Handle signin mode (opened as a separate window for sign-in)
async function handleSigninMode(): Promise<void> {
  // Hide normal UI elements, show loading
  signinViewEl.classList.add("hidden");
  connectedViewEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");

  // Initialize SDK
  const sdkReady = await initSDKForSignIn();

  if (!sdkReady || !okoWallet) {
    loadingEl.classList.add("hidden");
    signinViewEl.classList.remove("hidden");
    console.error("[oko-popup] SDK initialization failed");
    return;
  }

  loadingEl.classList.add("hidden");

  try {
    await okoWallet.openSignInModal();
    // Sign-in successful - window will be closed by accountsChanged handler
    // or we close it here after a delay
    setTimeout(() => {
      window.close();
    }, 1000);
  } catch (error) {
    console.error("[oko-popup] Sign-in error:", error);
    // On error or cancel, close the window
    window.close();
  }
}

// Event listeners
signinBtn.addEventListener("click", openSignIn);
disconnectBtn.addEventListener("click", disconnect);

// Initialize
(async () => {
  // Check if we're in sign mode
  if (signMode) {
    signinViewEl.classList.add("hidden");
    connectedViewEl.classList.add("hidden");
    loadingEl.classList.add("hidden");
    await handleSignMode();
    return;
  }

  // Check if we're in signin mode (separate window for sign-in)
  if (signinMode) {
    await handleSigninMode();
    return;
  }

  // Normal popup mode - load state from background storage
  const state = await loadStateFromBackground();
  updateUI(state);
})();
