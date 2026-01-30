import { PublicKey } from "@solana/web3.js";

import { OkoSvmWallet } from "@oko-wallet-sdk-svm/svm_wallet";
import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";
import {
  SolanaRpcError,
  SolanaRpcErrorCode,
} from "@oko-wallet-sdk-svm/methods/make_signature";
import {
  createMockOkoWallet,
  createMockOkoWalletWithNoAccount,
  MOCK_ED25519_PUBLIC_KEY,
} from "./mock";

describe("OkoSvmWallet - Base Operations", () => {
  describe("Constructor", () => {
    it("should create wallet instance with initial state", () => {
      const mockOkoWallet = createMockOkoWallet();
      const wallet = new (OkoSvmWallet as any)(
        mockOkoWallet,
      ) as OkoSvmWalletInterface;

      expect(wallet.okoWallet).toBe(mockOkoWallet);
      expect(wallet.state.publicKey).toBeNull();
      expect(wallet.state.publicKeyRaw).toBeNull();
      expect(wallet.publicKey).toBeNull();
      expect(wallet.connecting).toBe(false);
      expect(wallet.connected).toBe(false);
    });
  });

  describe("connect", () => {
    it("should connect and set public key", async () => {
      const mockOkoWallet = createMockOkoWallet();
      const wallet = new (OkoSvmWallet as any)(
        mockOkoWallet,
      ) as OkoSvmWalletInterface;

      await wallet.connect();

      expect(wallet.connected).toBe(true);
      expect(wallet.connecting).toBe(false);
      expect(wallet.publicKey).toBeInstanceOf(PublicKey);
      expect(wallet.state.publicKey).toBeInstanceOf(PublicKey);
      expect(wallet.state.publicKeyRaw).toBe(MOCK_ED25519_PUBLIC_KEY);
    });

    it("should not reconnect if already connected", async () => {
      const mockOkoWallet = createMockOkoWallet();
      const wallet = new (OkoSvmWallet as any)(
        mockOkoWallet,
      ) as OkoSvmWalletInterface;

      await wallet.connect();
      const firstPublicKey = wallet.publicKey;

      await wallet.connect();

      expect(wallet.publicKey).toBe(firstPublicKey);
    });

    it("should throw error if no Ed25519 key found", async () => {
      const mockOkoWallet = createMockOkoWalletWithNoAccount();
      const wallet = new (OkoSvmWallet as any)(
        mockOkoWallet,
      ) as OkoSvmWalletInterface;

      await expect(wallet.connect()).rejects.toThrow(
        "No Ed25519 key found. Please sign in first.",
      );
      expect(wallet.connected).toBe(false);
      expect(wallet.connecting).toBe(false);
    });
  });

  describe("disconnect", () => {
    it("should disconnect and clear state", async () => {
      const mockOkoWallet = createMockOkoWallet();
      const wallet = new (OkoSvmWallet as any)(
        mockOkoWallet,
      ) as OkoSvmWalletInterface;

      await wallet.connect();
      expect(wallet.connected).toBe(true);

      await wallet.disconnect();

      expect(wallet.connected).toBe(false);
      expect(wallet.publicKey).toBeNull();
      expect(wallet.state.publicKey).toBeNull();
      expect(wallet.state.publicKeyRaw).toBeNull();
    });
  });

  describe("signMessage", () => {
    it("should throw error if not connected", async () => {
      const mockOkoWallet = createMockOkoWallet();
      const wallet = new (OkoSvmWallet as any)(
        mockOkoWallet,
      ) as OkoSvmWalletInterface;

      const message = new TextEncoder().encode("Hello, Solana!");

      await expect(wallet.signMessage(message)).rejects.toMatchObject({
        code: SolanaRpcErrorCode.Internal,
        message: "Wallet not connected",
      });
    });

    it("should sign message when connected", async () => {
      const mockOkoWallet = createMockOkoWallet();
      const wallet = new (OkoSvmWallet as any)(
        mockOkoWallet,
      ) as OkoSvmWalletInterface;

      await wallet.connect();

      const message = new TextEncoder().encode("Hello, Solana!");
      const signature = await wallet.signMessage(message);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64); // Ed25519 signature is 64 bytes
    });
  });
});
