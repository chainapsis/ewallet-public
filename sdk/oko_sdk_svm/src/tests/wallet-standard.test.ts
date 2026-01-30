import { jest } from "@jest/globals";
import type { IdentifierString } from "@wallet-standard/base";

import { createMockOkoWallet } from "./mock";
import { OkoSvmWallet } from "@oko-wallet-sdk-svm/svm_wallet";
import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";
import {
  buildSignInMessage,
  OKO_WALLET_NAME,
  OkoSvmWalletAccount,
  OkoStandardWallet,
  type WalletStandardConfig,
} from "@oko-wallet-sdk-svm/wallet-standard";

// Mock config for testing
const TEST_MAINNET_CHAIN = "test:mainnet" as IdentifierString;
const TEST_DEVNET_CHAIN = "test:devnet" as IdentifierString;

const TEST_CHAINS = [TEST_MAINNET_CHAIN, TEST_DEVNET_CHAIN] as const;

const TEST_CONFIG: WalletStandardConfig = {
  chains: TEST_CHAINS,
  features: {
    signIn: "test:signIn" as IdentifierString,
    signMessage: "test:signMessage" as IdentifierString,
    signTransaction: "test:signTransaction" as IdentifierString,
    signAndSendTransaction: "test:signAndSendTransaction" as IdentifierString,
  },
  rpcEndpoints: {
    [TEST_MAINNET_CHAIN]: "https://api.test.mainnet",
    [TEST_DEVNET_CHAIN]: "https://api.test.devnet",
  },
};

describe("Wallet Standard", () => {
  describe("OkoSvmWalletAccount", () => {
    it("should create account with correct properties", () => {
      const address = "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f";
      const publicKey = new Uint8Array(32).fill(0x7f);
      const features = Object.values(TEST_CONFIG.features);

      const account = new OkoSvmWalletAccount(
        address,
        publicKey,
        TEST_CHAINS,
        features,
      );

      expect(account.address).toBe(address);
      expect(account.publicKey).toEqual(publicKey);
      expect(account.chains).toEqual(TEST_CHAINS);
      expect(account.features).toEqual(features);
    });
  });

  describe("OkoStandardWallet", () => {
    let wallet: OkoSvmWalletInterface;
    let standardWallet: OkoStandardWallet;

    beforeEach(async () => {
      const mockOkoWallet = createMockOkoWallet();
      wallet = new (OkoSvmWallet as any)(
        mockOkoWallet,
      ) as OkoSvmWalletInterface;
      standardWallet = new OkoStandardWallet(wallet, [TEST_CONFIG]);
    });

    describe("Wallet properties", () => {
      it("should have correct name", () => {
        expect(standardWallet.name).toBe(OKO_WALLET_NAME);
        expect(standardWallet.name).toBe("Oko");
      });

      it("should have correct version", () => {
        expect(standardWallet.version).toBe("1.0.0");
      });

      it("should have correct icon", () => {
        expect(standardWallet.icon).toMatch(/^data:image\//);
      });

      it("should have correct chains from config", () => {
        expect(standardWallet.chains).toEqual(TEST_CHAINS);
      });

      it("should have empty accounts when not connected", () => {
        expect(standardWallet.accounts).toEqual([]);
      });
    });

    describe("Features", () => {
      it("should have standard:connect feature", () => {
        const features = standardWallet.features as any;
        expect(features["standard:connect"]).toBeDefined();
        expect(features["standard:connect"].version).toBe("1.0.0");
        expect(typeof features["standard:connect"].connect).toBe("function");
      });

      it("should have standard:disconnect feature", () => {
        const features = standardWallet.features as any;
        expect(features["standard:disconnect"]).toBeDefined();
        expect(features["standard:disconnect"].version).toBe("1.0.0");
        expect(typeof features["standard:disconnect"].disconnect).toBe(
          "function",
        );
      });

      it("should have standard:events feature", () => {
        const features = standardWallet.features as any;
        expect(features["standard:events"]).toBeDefined();
        expect(features["standard:events"].version).toBe("1.0.0");
        expect(typeof features["standard:events"].on).toBe("function");
      });

      it("should have signMessage feature from config", () => {
        const features = standardWallet.features as any;
        expect(features[TEST_CONFIG.features.signMessage]).toBeDefined();
        expect(features[TEST_CONFIG.features.signMessage].version).toBe(
          "1.0.0",
        );
      });

      it("should have signTransaction feature from config", () => {
        const features = standardWallet.features as any;
        expect(features[TEST_CONFIG.features.signTransaction]).toBeDefined();
        expect(features[TEST_CONFIG.features.signTransaction].version).toBe(
          "1.0.0",
        );
        expect(
          features[TEST_CONFIG.features.signTransaction]
            .supportedTransactionVersions,
        ).toContain("legacy");
        expect(
          features[TEST_CONFIG.features.signTransaction]
            .supportedTransactionVersions,
        ).toContain(0);
      });

      it("should have signAndSendTransaction feature from config", () => {
        const features = standardWallet.features as any;
        expect(
          features[TEST_CONFIG.features.signAndSendTransaction],
        ).toBeDefined();
        expect(
          features[TEST_CONFIG.features.signAndSendTransaction].version,
        ).toBe("1.0.0");
        expect(
          features[TEST_CONFIG.features.signAndSendTransaction]
            .supportedTransactionVersions,
        ).toContain("legacy");
        expect(
          features[TEST_CONFIG.features.signAndSendTransaction]
            .supportedTransactionVersions,
        ).toContain(0);
      });
    });

    describe("Connect", () => {
      it("should connect and return accounts", async () => {
        const features = standardWallet.features as any;
        const result = await features["standard:connect"].connect();

        expect(result.accounts).toHaveLength(1);
        expect(result.accounts[0]).toBeInstanceOf(OkoSvmWalletAccount);
      });

      it("should update accounts after connect", async () => {
        expect(standardWallet.accounts).toHaveLength(0);

        const features = standardWallet.features as any;
        await features["standard:connect"].connect();

        expect(standardWallet.accounts).toHaveLength(1);
      });
    });

    describe("Disconnect", () => {
      it("should disconnect successfully", async () => {
        const features = standardWallet.features as any;
        await features["standard:connect"].connect();
        expect(standardWallet.accounts).toHaveLength(1);

        await features["standard:disconnect"].disconnect();
        expect(wallet.connected).toBe(false);
      });
    });

    describe("Events", () => {
      it("should register and unregister event listeners", () => {
        const features = standardWallet.features as any;
        const listener = jest.fn();

        const unsubscribe = features["standard:events"].on("change", listener);

        expect(typeof unsubscribe).toBe("function");

        unsubscribe();
      });

      it("should emit change event on connect", async () => {
        const features = standardWallet.features as any;
        const listener = jest.fn();

        features["standard:events"].on("change", listener);
        await features["standard:connect"].connect();

        expect(listener).toHaveBeenCalled();
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            accounts: expect.any(Array),
          }),
        );
      });

      it("should emit change event on disconnect", async () => {
        const features = standardWallet.features as any;
        const listener = jest.fn();

        await features["standard:connect"].connect();

        features["standard:events"].on("change", listener);
        await features["standard:disconnect"].disconnect();

        expect(listener).toHaveBeenCalled();
      });
    });
  });

  describe("WalletStandardConfig", () => {
    it("should have correct feature identifiers", () => {
      const features = TEST_CONFIG.features;
      expect(features.signIn).toBe("test:signIn");
      expect(features.signMessage).toBe("test:signMessage");
      expect(features.signTransaction).toBe("test:signTransaction");
      expect(features.signAndSendTransaction).toBe(
        "test:signAndSendTransaction",
      );
    });
  });

  describe("Sign In (SIWS)", () => {
    describe("buildSignInMessage", () => {
      it("should build basic SIWS message", () => {
        const input = {
          domain: "example.com",
          statement: "Sign in to Example App",
        };
        const address = "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f";

        const message = buildSignInMessage(input, address);

        expect(message).toContain("example.com wants you to sign in");
        expect(message).toContain(address);
        expect(message).toContain("Sign in to Example App");
      });

      it("should include all optional fields", () => {
        const input = {
          domain: "example.com",
          statement: "Sign in",
          uri: "https://example.com",
          version: "1",
          chainId: "mainnet",
          nonce: "abc123",
          issuedAt: "2024-01-01T00:00:00Z",
          expirationTime: "2024-01-02T00:00:00Z",
          notBefore: "2024-01-01T00:00:00Z",
          requestId: "req-123",
          resources: ["https://api.example.com", "https://storage.example.com"],
        };
        const address = "abc123";

        const message = buildSignInMessage(input, address);

        expect(message).toContain("URI: https://example.com");
        expect(message).toContain("Version: 1");
        expect(message).toContain("Chain ID: mainnet");
        expect(message).toContain("Nonce: abc123");
        expect(message).toContain("Issued At: 2024-01-01T00:00:00Z");
        expect(message).toContain("Expiration Time: 2024-01-02T00:00:00Z");
        expect(message).toContain("Not Before: 2024-01-01T00:00:00Z");
        expect(message).toContain("Request ID: req-123");
        expect(message).toContain("Resources:");
        expect(message).toContain("- https://api.example.com");
        expect(message).toContain("- https://storage.example.com");
      });

      it("should omit optional fields when not provided", () => {
        const input = {
          domain: "example.com",
        };
        const address = "abc123";

        const message = buildSignInMessage(input, address);

        expect(message).not.toContain("URI:");
        expect(message).not.toContain("Version:");
        expect(message).not.toContain("Chain ID:");
        expect(message).not.toContain("Nonce:");
        expect(message).not.toContain("Resources:");
      });
    });

    describe("signIn feature", () => {
      let wallet: OkoSvmWalletInterface;
      let standardWallet: OkoStandardWallet;

      beforeEach(() => {
        const mockOkoWallet = createMockOkoWallet();
        wallet = new (OkoSvmWallet as any)(
          mockOkoWallet,
        ) as OkoSvmWalletInterface;
        standardWallet = new OkoStandardWallet(wallet, [TEST_CONFIG]);
      });

      it("should have signIn feature from config", () => {
        const features = standardWallet.features as any;
        expect(features[TEST_CONFIG.features.signIn]).toBeDefined();
        expect(features[TEST_CONFIG.features.signIn].version).toBe("1.0.0");
        expect(typeof features[TEST_CONFIG.features.signIn].signIn).toBe(
          "function",
        );
      });
    });
  });
});
