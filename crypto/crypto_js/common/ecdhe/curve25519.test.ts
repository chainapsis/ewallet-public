import { describe, expect, it } from "@jest/globals";
import { Bytes } from "@oko-wallet/bytes";

import {
  generateEddsaKeypair,
  isValidPublicKey,
  signMessage,
  verifySignature,
} from "./curve25519";
import { deriveSessionKey } from "./key_derivation";

describe("x25519_keypair_test_1", () => {
  it("generate_eddsa_keypair", () => {
    const keypair = generateEddsaKeypair();
    expect(keypair.success).toBe(true);
    if (!keypair.success) {
      return;
    }

    expect(keypair.data.privateKey).toBeDefined();
    expect(keypair.data.publicKey).toBeDefined();
  });
});

describe("EdDSA signature and verification", () => {
  describe("signMessage", () => {
    it("should successfully sign a message", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const message = "Hello, world!";
      const signature = signMessage(message, keypair.data.privateKey);

      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      expect(signature.data.r).toBeDefined();
      expect(signature.data.s).toBeDefined();
      expect(signature.data.r.toUint8Array()).toHaveLength(32);
      expect(signature.data.s.toUint8Array()).toHaveLength(32);
    });

    it("should sign different messages with different signatures", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const message1 = "Hello, world!";
      const message2 = "Different message";

      const sig1 = signMessage(message1, keypair.data.privateKey);
      const sig2 = signMessage(message2, keypair.data.privateKey);

      expect(sig1.success).toBe(true);
      expect(sig2.success).toBe(true);
      if (!sig1.success || !sig2.success) {
        return;
      }

      const sig1Bytes = sig1.data.r.toHex() + sig1.data.s.toHex();
      const sig2Bytes = sig2.data.r.toHex() + sig2.data.s.toHex();
      expect(sig1Bytes).not.toBe(sig2Bytes);
    });

    it("should handle empty message", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const signature = signMessage("", keypair.data.privateKey);
      expect(signature.success).toBe(true);
    });

    it("should handle long messages", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const longMessage = "a".repeat(10000);
      const signature = signMessage(longMessage, keypair.data.privateKey);
      expect(signature.success).toBe(true);
    });

    it("should handle unicode messages", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const unicodeMessage = "안녕하세요 🚀 こんにちは";
      const signature = signMessage(unicodeMessage, keypair.data.privateKey);
      expect(signature.success).toBe(true);
    });
  });

  describe("verifySignature", () => {
    it("should verify a valid signature", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const message = "Hello, world!";
      const signature = signMessage(message, keypair.data.privateKey);
      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      const isValid = verifySignature(
        message,
        signature.data,
        keypair.data.publicKey,
      );
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(true);
    });

    it("should reject signature for modified message", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const originalMessage = "Hello, world!";
      const modifiedMessage = "Hello, world";

      const signature = signMessage(originalMessage, keypair.data.privateKey);
      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      const isValid = verifySignature(
        modifiedMessage,
        signature.data,
        keypair.data.publicKey,
      );
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(false);
    });

    it("should reject signature with wrong public key", () => {
      const keypair1 = generateEddsaKeypair();
      const keypair2 = generateEddsaKeypair();
      expect(keypair1.success).toBe(true);
      expect(keypair2.success).toBe(true);
      if (!keypair1.success || !keypair2.success) {
        return;
      }

      const message = "Hello, world!";
      const signature = signMessage(message, keypair1.data.privateKey);
      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      const isValid = verifySignature(
        message,
        signature.data,
        keypair2.data.publicKey,
      );
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(false);
    });

    it("should reject invalid signature (modified r)", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const message = "Hello, world!";
      const signature = signMessage(message, keypair.data.privateKey);
      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      const modifiedR = Bytes.fromUint8Array(new Uint8Array(32).fill(0xff), 32);
      expect(modifiedR.success).toBe(true);
      if (!modifiedR.success) {
        return;
      }

      const modifiedSignature = {
        r: modifiedR.data,
        s: signature.data.s,
      };

      const isValid = verifySignature(
        message,
        modifiedSignature,
        keypair.data.publicKey,
      );
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(false);
    });

    it("should reject invalid signature (modified s)", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const message = "Hello, world!";
      const signature = signMessage(message, keypair.data.privateKey);
      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      const modifiedS = Bytes.fromUint8Array(new Uint8Array(32).fill(0xff), 32);
      expect(modifiedS.success).toBe(true);
      if (!modifiedS.success) {
        return;
      }

      const modifiedSignature = {
        r: signature.data.r,
        s: modifiedS.data,
      };

      const isValid = verifySignature(
        message,
        modifiedSignature,
        keypair.data.publicKey,
      );
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(false);
    });

    it("should verify signature for empty message", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const message = "";
      const signature = signMessage(message, keypair.data.privateKey);
      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      const isValid = verifySignature(
        message,
        signature.data,
        keypair.data.publicKey,
      );
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(true);
    });

    it("should verify signature for unicode message", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const message = "안녕하세요 🚀 こんにちは";
      const signature = signMessage(message, keypair.data.privateKey);
      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      const isValid = verifySignature(
        message,
        signature.data,
        keypair.data.publicKey,
      );
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(true);
    });
  });

  describe("sign and verify integration", () => {
    it("should handle multiple sign-verify cycles", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const messages = [
        "Message 1",
        "Message 2",
        "Message 3",
        "Message 4",
        "Message 5",
      ];

      for (const message of messages) {
        const signature = signMessage(message, keypair.data.privateKey);
        expect(signature.success).toBe(true);
        if (!signature.success) {
          continue;
        }

        const isValid = verifySignature(
          message,
          signature.data,
          keypair.data.publicKey,
        );
        expect(isValid.success).toBe(true);
        if (!isValid.success) {
          continue;
        }
        expect(isValid.data).toBe(true);
      }
    });

    it("should produce deterministic signatures with same options", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const message = "Deterministic test";
      const sig1 = signMessage(message, keypair.data.privateKey);
      const sig2 = signMessage(message, keypair.data.privateKey);

      expect(sig1.success).toBe(true);
      expect(sig2.success).toBe(true);
      if (!sig1.success || !sig2.success) {
        return;
      }

      expect(sig1.data.r.toHex()).toBe(sig2.data.r.toHex());
      expect(sig1.data.s.toHex()).toBe(sig2.data.s.toHex());
    });
  });

  describe("isValidPublicKey", () => {
    it("should validate a valid public key", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const isValid = isValidPublicKey(keypair.data.publicKey);
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(true);
    });

    it("should validate multiple generated public keys", () => {
      for (let i = 0; i < 10; i++) {
        const keypair = generateEddsaKeypair();
        expect(keypair.success).toBe(true);
        if (!keypair.success) {
          continue;
        }

        const isValid = isValidPublicKey(keypair.data.publicKey);
        expect(isValid.success).toBe(true);
        if (!isValid.success) {
          continue;
        }
        expect(isValid.data).toBe(true);
      }
    });

    it("should check validity of all zeros public key", () => {
      const zeroKey = Bytes.fromUint8Array(new Uint8Array(32).fill(0), 32);
      expect(zeroKey.success).toBe(true);
      if (!zeroKey.success) {
        return;
      }

      const isValid = isValidPublicKey(zeroKey.data);
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      // All zeros can be valid in Ed25519
      expect(typeof isValid.data).toBe("boolean");
    });

    it("should check validity of all ones public key", () => {
      const onesKey = Bytes.fromUint8Array(new Uint8Array(32).fill(0xff), 32);
      expect(onesKey.success).toBe(true);
      if (!onesKey.success) {
        return;
      }

      const isValid = isValidPublicKey(onesKey.data);
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      // All ones is likely invalid in Ed25519, but the validation function itself should succeed
      expect(typeof isValid.data).toBe("boolean");
    });

    it("should reject invalid public key with all 0xff", () => {
      const randomBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = 0xff;
      }

      const invalidKey = Bytes.fromUint8Array(randomBytes, 32);
      expect(invalidKey.success).toBe(true);
      if (!invalidKey.success) {
        return;
      }

      const isValid = isValidPublicKey(invalidKey.data);
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(false);
    });

    it("should handle edge case with specific patterns", () => {
      // Test various byte array patterns
      const patterns = [
        new Uint8Array(32).fill(1), // all 1s
        new Uint8Array(32).fill(127), // all 127s
        new Uint8Array(32).fill(128), // all 128s
        new Uint8Array(32).fill(255), // all 255s
      ];

      for (const pattern of patterns) {
        const key = Bytes.fromUint8Array(pattern, 32);
        expect(key.success).toBe(true);
        if (!key.success) {
          continue;
        }

        const isValid = isValidPublicKey(key.data);
        // The validation function should always execute successfully
        expect(isValid.success).toBe(true);
        if (!isValid.success) {
          continue;
        }
        // The result can be either valid or invalid
        expect(typeof isValid.data).toBe("boolean");
      }
    });

    it("should detect invalid public key that cannot verify signatures", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const message = "Test message";
      const signature = signMessage(message, keypair.data.privateKey);
      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      // Verification should fail with an invalid public key
      const invalidKey = Bytes.fromUint8Array(
        new Uint8Array(32).fill(0xaa),
        32,
      );
      expect(invalidKey.success).toBe(true);
      if (!invalidKey.success) {
        return;
      }

      const verification = verifySignature(
        message,
        signature.data,
        invalidKey.data,
      );
      expect(verification.success).toBe(true);
      if (!verification.success) {
        return;
      }
      // Verification fails with invalid public key
      expect(verification.data).toBe(false);
    });

    it("should consistently validate the same public key", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      // Validating the same public key multiple times should yield the same result
      const result1 = isValidPublicKey(keypair.data.publicKey);
      const result2 = isValidPublicKey(keypair.data.publicKey);
      const result3 = isValidPublicKey(keypair.data.publicKey);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      if (!result1.success || !result2.success || !result3.success) {
        return;
      }

      expect(result1.data).toBe(result2.data);
      expect(result2.data).toBe(result3.data);
    });

    it("should validate public key used in signature verification", () => {
      const keypair = generateEddsaKeypair();
      expect(keypair.success).toBe(true);
      if (!keypair.success) {
        return;
      }

      const isValid = isValidPublicKey(keypair.data.publicKey);
      expect(isValid.success).toBe(true);
      if (!isValid.success) {
        return;
      }
      expect(isValid.data).toBe(true);

      const message = "Test message";
      const signature = signMessage(message, keypair.data.privateKey);
      expect(signature.success).toBe(true);
      if (!signature.success) {
        return;
      }

      const verification = verifySignature(
        message,
        signature.data,
        keypair.data.publicKey,
      );
      expect(verification.success).toBe(true);
      if (!verification.success) {
        return;
      }
      expect(verification.data).toBe(true);
    });
  });
});

describe("x25519_key_derivation_test", () => {
  it("alice and bob derive the same shared secret", () => {
    const aliceKeypair = generateEddsaKeypair();
    expect(aliceKeypair.success).toBe(true);
    if (!aliceKeypair.success) {
      return;
    }

    const bobKeypair = generateEddsaKeypair();
    expect(bobKeypair.success).toBe(true);
    if (!bobKeypair.success) {
      return;
    }

    const aliceSharedSecret = deriveSessionKey(
      aliceKeypair.data.privateKey,
      bobKeypair.data.publicKey,
      "oko-v1",
    );
    expect(aliceSharedSecret.success).toBe(true);
    if (!aliceSharedSecret.success) {
      return;
    }

    const bobSharedSecret = deriveSessionKey(
      bobKeypair.data.privateKey,
      aliceKeypair.data.publicKey,
      "oko-v1",
    );
    expect(bobSharedSecret.success).toBe(true);
    if (!bobSharedSecret.success) {
      return;
    }

    expect(aliceSharedSecret.data).toEqual(bobSharedSecret.data);
  });
});
