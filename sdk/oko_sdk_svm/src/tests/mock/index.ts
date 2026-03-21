import {
  EventEmitter3,
  type OkoWalletInterface,
  type OpenModalAckPayload,
  type OpenModalError,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

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

  const mockState = {
    authType: publicKeyEd25519 ? ("google" as const) : null,
    email: publicKeyEd25519 ? "test@example.com" : null,
    publicKey: publicKey,
    name: publicKeyEd25519 ? "Test User" : null,
  };

  const mockWallet: OkoWalletInterface = {
    origin: "https://test-dapp.com",
    state: mockState,
    apiKey: "test-api-key",
    sdkEndpoint: "https://test-sdk.example.com",
    eventEmitter: new EventEmitter3(),
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

    openSignInModal: async () => {},

    closeModal: () => {},

    setTheme: async () => {},

    sendMsgToIframe: async (msg) => msg,

    signIn: async () => {},

    signOut: async () => {},

    getPublicKey: async () => publicKey,

    getPublicKeyEd25519: async () => publicKeyEd25519,

    getEmail: async () => mockState.email,

    getName: async () => mockState.name,

    getWalletInfo: async () => null,

    getAuthType: async () => mockState.authType,

    startEmailSignIn: async () => {},

    completeEmailSignIn: async () => {},

    on: (_handlerDef) => {
      // No-op for tests
    },

    off: (_handlerDef) => {
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
