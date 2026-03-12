import { describe, expect, it } from "@jest/globals";
import { Bytes } from "@oko-wallet/bytes";

import { generateEddsaKeypair } from "../../common/ecdhe/curve25519";
import { deriveSessionKey } from "../../common/ecdhe/key_derivation";
import { decryptWithEcdheKey, encryptWithEcdheKey } from "./aes_gcm";

describe("AES-GCM encryption and decryption in Node.js", () => {
  const createSessionKey = () => {
    const keypair1 = generateEddsaKeypair();
    const keypair2 = generateEddsaKeypair();
    if (!keypair1.success || !keypair2.success) {
      throw new Error("Failed to generate keypair");
    }

    const sessionKey = deriveSessionKey(
      keypair1.data.privateKey,
      keypair2.data.publicKey,
      "oko-v1",
    );
    if (!sessionKey.success) {
      throw new Error("Failed to derive session key");
    }
    return sessionKey.data;
  };

  describe("encryptData in Node.js", () => {
    it("should successfully encrypt data in Node.js", async () => {
      const sessionKey = createSessionKey();
      const plaintext = new TextEncoder().encode("Hello, world!");

      const result = await encryptWithEcdheKey(plaintext, sessionKey);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      // iv(12) + ciphertext + authTag(16)
      expect(result.data.length).toBeGreaterThan(12 + 16);
    });

    it("should produce different ciphertexts for the same plaintext (random IV) in Node.js", async () => {
      const sessionKey = createSessionKey();
      const plaintext = new TextEncoder().encode("Hello, world!");

      const result1 = await encryptWithEcdheKey(plaintext, sessionKey);
      const result2 = await encryptWithEcdheKey(plaintext, sessionKey);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (!result1.success || !result2.success) {
        return;
      }

      // Same plaintext, different IV, different ciphertext
      const hex1 = result1.data.toHex();
      const hex2 = result2.data.toHex();
      expect(hex1).not.toBe(hex2);
    });

    it("should encrypt empty data in Node.js", async () => {
      const sessionKey = createSessionKey();
      const plaintext = new Uint8Array(0);

      const result = await encryptWithEcdheKey(plaintext, sessionKey);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      // iv(12) + authTag(16) = 28 bytes minimum
      expect(result.data.length).toBe(12 + 16);
    });

    it("should encrypt large data in Node.js", async () => {
      const sessionKey = createSessionKey();
      const plaintext = new Uint8Array(10000).fill(0xab);

      const result = await encryptWithEcdheKey(plaintext, sessionKey);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.data.length).toBe(12 + 10000 + 16);
    });
  });

  describe("decryptData in Node.js", () => {
    it("should successfully decrypt encrypted data", async () => {
      const sessionKey = createSessionKey();
      const originalText = "Hello, world!";
      const plaintext = new TextEncoder().encode(originalText);

      const encrypted = await encryptWithEcdheKey(plaintext, sessionKey);
      expect(encrypted.success).toBe(true);
      if (!encrypted.success) {
        return;
      }

      const decrypted = await decryptWithEcdheKey(encrypted.data, sessionKey);
      expect(decrypted.success).toBe(true);
      if (!decrypted.success) {
        return;
      }

      const decryptedText = new TextDecoder().decode(
        decrypted.data.toUint8Array(),
      );
      expect(decryptedText).toBe(originalText);
    });

    it("should decrypt empty data in Node.js", async () => {
      const sessionKey = createSessionKey();
      const plaintext = new Uint8Array(0);

      const encrypted = await encryptWithEcdheKey(plaintext, sessionKey);
      expect(encrypted.success).toBe(true);
      if (!encrypted.success) {
        return;
      }

      const decrypted = await decryptWithEcdheKey(encrypted.data, sessionKey);
      expect(decrypted.success).toBe(true);
      if (!decrypted.success) {
        return;
      }

      expect(decrypted.data.length).toBe(0);
    });

    it("should decrypt large data in Node.js", async () => {
      const sessionKey = createSessionKey();
      const plaintext = new Uint8Array(10000);
      for (let i = 0; i < plaintext.length; i++) {
        plaintext[i] = i % 256;
      }

      const encrypted = await encryptWithEcdheKey(plaintext, sessionKey);
      expect(encrypted.success).toBe(true);
      if (!encrypted.success) {
        return;
      }

      const decrypted = await decryptWithEcdheKey(encrypted.data, sessionKey);
      expect(decrypted.success).toBe(true);
      if (!decrypted.success) {
        return;
      }

      expect(decrypted.data.toUint8Array()).toEqual(plaintext);
    });

    it("should fail with too short encrypted data in Node.js", async () => {
      const sessionKey = createSessionKey();
      const shortData = new Uint8Array(10); // < 12 + 16
      const shortDataBytes = Bytes.fromUint8Array(shortData, shortData.length);
      expect(shortDataBytes.success).toBe(true);
      if (!shortDataBytes.success) {
        return;
      }

      const result = await decryptWithEcdheKey(shortDataBytes.data, sessionKey);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }
      expect(result.err).toBe("Encrypted data is too short");
    });

    it("should fail with wrong key in Node.js", async () => {
      const sessionKey1 = createSessionKey();
      const sessionKey2 = createSessionKey();
      const plaintext = new TextEncoder().encode("Secret message");

      const encrypted = await encryptWithEcdheKey(plaintext, sessionKey1);
      expect(encrypted.success).toBe(true);
      if (!encrypted.success) {
        return;
      }

      const decrypted = await decryptWithEcdheKey(encrypted.data, sessionKey2);
      expect(decrypted.success).toBe(false);
    });

    it("should fail with tampered ciphertext in Node.js", async () => {
      const sessionKey = createSessionKey();
      const plaintext = new TextEncoder().encode("Secret message");

      const encrypted = await encryptWithEcdheKey(plaintext, sessionKey);
      expect(encrypted.success).toBe(true);
      if (!encrypted.success) {
        return;
      }

      // Tampering with ciphertext (modifying data after the IV)
      const tampered = new Uint8Array(encrypted.data.toUint8Array());
      tampered[15] ^= 0xff;
      const tamperedBytes = Bytes.fromUint8Array(tampered, tampered.length);
      expect(tamperedBytes.success).toBe(true);
      if (!tamperedBytes.success) {
        return;
      }

      const decrypted = await decryptWithEcdheKey(
        tamperedBytes.data,
        sessionKey,
      );
      expect(decrypted.success).toBe(false);
    });

    it("should fail with tampered IV in Node.js", async () => {
      const sessionKey = createSessionKey();
      const plaintext = new TextEncoder().encode("Secret message");

      const encrypted = await encryptWithEcdheKey(plaintext, sessionKey);
      expect(encrypted.success).toBe(true);
      if (!encrypted.success) {
        return;
      }

      // Tampering with IV
      const tampered = new Uint8Array(encrypted.data.toUint8Array());
      tampered[0] ^= 0xff;
      const tamperedBytes = Bytes.fromUint8Array(tampered, tampered.length);
      expect(tamperedBytes.success).toBe(true);
      if (!tamperedBytes.success) {
        return;
      }

      const decrypted = await decryptWithEcdheKey(
        tamperedBytes.data,
        sessionKey,
      );
      expect(decrypted.success).toBe(false);
    });

    it("should fail with tampered auth tag in Node.js", async () => {
      const sessionKey = createSessionKey();
      const plaintext = new TextEncoder().encode("Secret message");

      const encrypted = await encryptWithEcdheKey(plaintext, sessionKey);
      expect(encrypted.success).toBe(true);
      if (!encrypted.success) {
        return;
      }

      // Tampering with auth tag (last 16 bytes)
      const tampered = new Uint8Array(encrypted.data.toUint8Array());
      tampered[tampered.length - 1] ^= 0xff;
      const tamperedBytes = Bytes.fromUint8Array(tampered, tampered.length);
      expect(tamperedBytes.success).toBe(true);
      if (!tamperedBytes.success) {
        return;
      }

      const decrypted = await decryptWithEcdheKey(
        tamperedBytes.data,
        sessionKey,
      );
      expect(decrypted.success).toBe(false);
    });
  });

  describe("encrypt-decrypt roundtrip in Node.js", () => {
    it("should handle unicode text", async () => {
      const sessionKey = createSessionKey();
      const originalText = "안녕하세요 🚀 こんにちは";
      const plaintext = new TextEncoder().encode(originalText);

      const encrypted = await encryptWithEcdheKey(plaintext, sessionKey);
      expect(encrypted.success).toBe(true);
      if (!encrypted.success) {
        return;
      }

      const decrypted = await decryptWithEcdheKey(encrypted.data, sessionKey);
      expect(decrypted.success).toBe(true);
      if (!decrypted.success) {
        return;
      }

      const decryptedText = new TextDecoder().decode(
        decrypted.data.toUint8Array(),
      );
      expect(decryptedText).toBe(originalText);
    });

    it("should handle binary data in Node.js", async () => {
      const sessionKey = createSessionKey();
      const binaryData = new Uint8Array([0x00, 0x01, 0xff, 0xfe, 0x80, 0x7f]);

      const encrypted = await encryptWithEcdheKey(binaryData, sessionKey);
      expect(encrypted.success).toBe(true);
      if (!encrypted.success) {
        return;
      }

      const decrypted = await decryptWithEcdheKey(encrypted.data, sessionKey);
      expect(decrypted.success).toBe(true);
      if (!decrypted.success) {
        return;
      }

      expect(decrypted.data.toUint8Array()).toEqual(binaryData);
    });

    it("should handle multiple encrypt-decrypt cycles in Node.js", async () => {
      const sessionKey = createSessionKey();
      const messages = [
        "First message",
        "Second message",
        "Third message",
        "Fourth message",
        "Fifth message",
      ];

      for (const message of messages) {
        const plaintext = new TextEncoder().encode(message);

        const encrypted = await encryptWithEcdheKey(plaintext, sessionKey);
        expect(encrypted.success).toBe(true);
        if (!encrypted.success) {
          continue;
        }

        const decrypted = await decryptWithEcdheKey(encrypted.data, sessionKey);
        expect(decrypted.success).toBe(true);
        if (!decrypted.success) {
          continue;
        }

        const decryptedText = new TextDecoder().decode(
          decrypted.data.toUint8Array(),
        );
        expect(decryptedText).toBe(message);
      }
    });
  });
});
