import type {
  OkoWalletInterface,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";
import type { OpenModalError } from "@oko-wallet/oko-sdk-core";
import { EventEmitter } from "eventemitter3";

// Mock Ed25519 public key (32 bytes in hex)
export const MOCK_ED25519_PUBLIC_KEY =
  "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f";

// Mock signature (64 bytes in hex)
export const MOCK_SIGNATURE =
  "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

export interface MockOkoWalletConfig {
  publicKeyEd25519?: string | null;
  publicKey?: string | null;
  shouldRejectSignature?: boolean;
  signatureResponse?: string;
  signaturesResponse?: string[];
}

export function createMockOkoWallet(
  config: MockOkoWalletConfig = {},
): OkoWalletInterface {
  const {
    publicKeyEd25519 = MOCK_ED25519_PUBLIC_KEY,
    publicKey = null,
    shouldRejectSignature = false,
    signatureResponse = MOCK_SIGNATURE,
    signaturesResponse = [MOCK_SIGNATURE],
  } = config;

  const eventEmitter = new EventEmitter();

  const mockWallet: OkoWalletInterface = {
    state: {
      authType: publicKeyEd25519 ? "google" : null,
      email: publicKeyEd25519 ? "test@example.com" : null,
      publicKey: publicKey,
      name: publicKeyEd25519 ? "Test User" : null,
    },
    apiKey: "test-api-key",
    iframe: {} as HTMLIFrameElement,
    activePopupId: null,
    activePopupWindow: null,
    sdkEndpoint: "https://test.oko.wallet",
    eventEmitter: eventEmitter as any,
    origin: "https://test-dapp.com",
    waitUntilInitialized: Promise.resolve({
      success: true,
      data: {
        authType: publicKeyEd25519 ? "google" : null,
        email: publicKeyEd25519 ? "test@example.com" : null,
        publicKey: publicKey,
        name: publicKeyEd25519 ? "Test User" : null,
      },
    } as Result<any, string>),

    openModal: async (
      msg,
    ): Promise<Result<OpenModalAckPayload, OpenModalError>> => {
      if (shouldRejectSignature) {
        return {
          success: true,
          data: {
            modal_type: "svm/make_signature",
            type: "reject",
          } as OpenModalAckPayload,
        };
      }

      // Determine response based on sign_type
      const signType = (msg.payload.data as any)?.sign_type;

      if (signType === "all_tx") {
        return {
          success: true,
          data: {
            modal_type: "svm/make_signature",
            type: "approve",
            data: {
              chain_type: "svm",
              sig_result: {
                type: "signatures",
                signatures: signaturesResponse,
              },
            },
          } as OpenModalAckPayload,
        };
      }

      return {
        success: true,
        data: {
          modal_type: "svm/make_signature",
          type: "approve",
          data: {
            chain_type: "svm",
            sig_result: {
              type: "signature",
              signature: signatureResponse,
            },
          },
        } as OpenModalAckPayload,
      };
    },

    closeModal: () => {},

    sendMsgToIframe: async (msg) => msg,

    signIn: async () => {},

    signOut: async () => {
      mockWallet.state.authType = null;
      mockWallet.state.email = null;
      mockWallet.state.publicKey = null;
      mockWallet.state.name = null;
    },

    getPublicKey: async () => publicKey,

    getPublicKeyEd25519: async () => publicKeyEd25519,

    getEmail: async () => (publicKeyEd25519 ? "test@example.com" : null),

    getName: async () => (publicKeyEd25519 ? "Test User" : null),

    getAuthType: async () => (publicKeyEd25519 ? "google" : null),

    getWalletInfo: async () =>
      publicKeyEd25519
        ? {
            authType: "google" as const,
            publicKey: publicKey ?? "",
            email: "test@example.com",
            name: "Test User",
          }
        : null,

    startEmailSignIn: async () => {},

    completeEmailSignIn: async () => {},

    openSignInModal: async () => {},

    on: (handlerDef) => {
      // No-op for tests
    },
  };

  return mockWallet;
}

export function createMockOkoWalletWithNoAccount(): OkoWalletInterface {
  return createMockOkoWallet({
    publicKeyEd25519: null,
    publicKey: null,
  });
}

export function createMockOkoWalletThatRejects(): OkoWalletInterface {
  return createMockOkoWallet({
    shouldRejectSignature: true,
  });
}
