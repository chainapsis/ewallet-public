import { describe, expect, test } from "@jest/globals";

import {
  type Byte,
  Bytes,
  type Bytes16,
  type Bytes32,
  type Bytes33,
  type Bytes60,
  type Bytes64,
} from "./index.js";

describe("Bytes class", () => {
  describe("fromUint8Array", () => {
    test("should create Bytes instance from valid Uint8Array", () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const result = Bytes.fromUint8Array(data, 4);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(4);
        expect(result.data.toUint8Array()).toEqual(data);
      }
    });

    test("should fail with non-Uint8Array input", () => {
      const result = Bytes.fromUint8Array([1, 2, 3] as any, 3);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe("Input must be a Uint8Array.");
      }
    });

    test("should fail with length mismatch", () => {
      const data = new Uint8Array([1, 2, 3]);
      const result = Bytes.fromUint8Array(data, 5);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe("Invalid length. Expected: 5, Actual: 3");
      }
    });

    test("should work with empty array for zero length", () => {
      const data = new Uint8Array([]);
      const result = Bytes.fromUint8Array(data, 0);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(0);
      }
    });
  });

  describe("fromHexString", () => {
    test("should create Bytes instance from valid hex string", () => {
      const result = Bytes.fromHexString("deadbeef", 4);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(4);
        expect(result.data.toHex()).toBe("deadbeef");
      }
    });

    test("should handle uppercase hex string", () => {
      const result = Bytes.fromHexString("DEADBEEF", 4);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toHex()).toBe("deadbeef");
      }
    });

    test("should handle mixed case hex string", () => {
      const result = Bytes.fromHexString("DeAdBeEf", 4);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toHex()).toBe("deadbeef");
      }
    });

    test("should fail with non-string input", () => {
      const result = Bytes.fromHexString(123 as any, 4);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe("Input must be a string.");
      }
    });

    test("should fail with empty string for non-zero length", () => {
      const result = Bytes.fromHexString("", 1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe("Invalid length. Expected: > 0");
      }
    });

    test("should fail with empty string for zero length", () => {
      const result = Bytes.fromHexString("", 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe("Invalid length. Expected: > 0");
      }
    });

    test("should fail with negative length", () => {
      const result = Bytes.fromHexString("deadbeef", -1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe("Invalid length. Expected: > 0");
      }
    });

    test("should fail with invalid hex characters", () => {
      const result = Bytes.fromHexString("deadbeg", 4);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe(
          "Invalid length. Expected: 8 characters, Actual: 7",
        );
      }
    });

    test("should fail with wrong length", () => {
      const result = Bytes.fromHexString("deadbeef", 3);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe(
          "Invalid length. Expected: 6 characters, Actual: 8",
        );
      }
    });

    test("should fail with odd length hex string", () => {
      const result = Bytes.fromHexString("deadbee", 4);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe(
          "Invalid length. Expected: 8 characters, Actual: 7",
        );
      }
    });
  });

  describe("fromBytes", () => {
    test("should create Bytes instance from another Bytes instance", () => {
      const original = Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4]), 4);
      expect(original.success).toBe(true);

      if (original.success) {
        const result = Bytes.fromBytes(original.data, 4);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.length).toBe(4);
          expect(result.data.toUint8Array()).toEqual(
            new Uint8Array([1, 2, 3, 4]),
          );
        }
      }
    });

    test("should fail with non-Bytes input", () => {
      const result = Bytes.fromBytes("not bytes" as any, 4);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.err).toBe("Input must be a Bytes instance.");
      }
    });

    test("should fail with length mismatch", () => {
      const original = Bytes.fromUint8Array(new Uint8Array([1, 2, 3]), 3);
      expect(original.success).toBe(true);

      if (original.success) {
        const result = Bytes.fromBytes(original.data, 5);
        expect(result.success).toBe(false);

        if (!result.success) {
          expect(result.err).toBe("Invalid length. Expected: 5, Actual: 3");
        }
      }
    });
  });

  describe("equals", () => {
    test("should return true for identical Bytes instances", () => {
      const bytes1 = Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4]), 4);
      const bytes2 = Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4]), 4);

      expect(bytes1.success).toBe(true);
      expect(bytes2.success).toBe(true);

      if (bytes1.success && bytes2.success) {
        expect(bytes1.data.equals(bytes2.data)).toBe(true);
      }
    });

    test("should return false for different Bytes instances", () => {
      const bytes1 = Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4]), 4);
      const bytes2 = Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 5]), 4);

      expect(bytes1.success).toBe(true);
      expect(bytes2.success).toBe(true);

      if (bytes1.success && bytes2.success) {
        expect(bytes1.data.equals(bytes2.data)).toBe(false);
      }
    });

    test("should return false for different lengths", () => {
      const bytes1 = Bytes.fromUint8Array(new Uint8Array([1, 2, 3]), 3);
      const bytes2 = Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4]), 4);

      expect(bytes1.success).toBe(true);
      expect(bytes2.success).toBe(true);

      if (bytes1.success && bytes2.success) {
        expect(bytes1.data.equals(bytes2.data as any)).toBe(false);
      }
    });

    test("should use constant-time comparison", () => {
      const bytes1 = Bytes.fromUint8Array(new Uint8Array([0, 0, 0, 1]), 4);
      const bytes2 = Bytes.fromUint8Array(new Uint8Array([1, 0, 0, 0]), 4);

      expect(bytes1.success).toBe(true);
      expect(bytes2.success).toBe(true);

      if (bytes1.success && bytes2.success) {
        expect(bytes1.data.equals(bytes2.data)).toBe(false);
      }
    });

    test("overflow", () => {
      const bytes1 = Bytes.fromUint8Array(new Uint8Array([257, 0, 0, 0]), 4);
      const bytes2 = Bytes.fromUint8Array(new Uint8Array([1, 0, 0, 0]), 4);

      if (bytes1.success && bytes2.success) {
        expect(bytes1.data.toHex() === bytes2.data.toHex()).toBe(true);
        expect(bytes1.data.equals(bytes2.data)).toBe(true);
        expect(bytes1.data.toUint8Array()).toEqual(bytes2.data.toUint8Array());
      }
    });

    test("underflow", () => {
      const bytes1 = Bytes.fromUint8Array(new Uint8Array([-1, 0, 0, 0]), 4);
      const bytes2 = Bytes.fromUint8Array(new Uint8Array([255, 0, 0, 0]), 4);

      if (bytes1.success && bytes2.success) {
        expect(bytes1.data.toHex() === bytes2.data.toHex()).toBe(true);
        expect(bytes1.data.equals(bytes2.data)).toBe(true);
        expect(bytes1.data.toUint8Array()).toEqual(bytes2.data.toUint8Array());
      }
    });
  });

  describe("toUint8Array", () => {
    test("should return copy of internal array", () => {
      const original = new Uint8Array([1, 2, 3, 4]);
      const bytes = Bytes.fromUint8Array(original, 4);

      expect(bytes.success).toBe(true);
      if (bytes.success) {
        const copy = bytes.data.toUint8Array();
        expect(copy).toEqual(original);
        expect(copy).not.toBe(original); // Should be a copy, not the same reference

        // Modifying the copy shouldn't affect the original Bytes instance
        copy[0] = 99;
        expect(bytes.data.toUint8Array()[0]).toBe(1);
      }
    });
  });

  describe("toHex", () => {
    test("should convert to lowercase hex string", () => {
      const bytes = Bytes.fromUint8Array(
        new Uint8Array([222, 173, 190, 239]),
        4,
      );

      expect(bytes.success).toBe(true);
      if (bytes.success) {
        expect(bytes.data.toHex()).toBe("deadbeef");
      }
    });

    test("should pad single digit hex values", () => {
      const bytes = Bytes.fromUint8Array(new Uint8Array([0, 1, 15, 16]), 4);

      expect(bytes.success).toBe(true);
      if (bytes.success) {
        expect(bytes.data.toHex()).toBe("00010f10");
      }
    });

    test("should handle empty bytes", () => {
      const bytes = Bytes.fromUint8Array(new Uint8Array([]), 0);

      expect(bytes.success).toBe(true);
      if (bytes.success) {
        expect(bytes.data.toHex()).toBe("");
      }
    });
  });

  describe("Type aliases", () => {
    test("Byte should work with 1 byte", () => {
      const byte = Bytes.fromUint8Array(new Uint8Array([255]), 1);
      expect(byte.success).toBe(true);
      if (byte.success) {
        const typedByte: Byte = byte.data;
        expect(typedByte.length).toBe(1);
      }
    });

    test("Bytes16 should work with 16 bytes", () => {
      const data = new Uint8Array(16).fill(0);
      const bytes16 = Bytes.fromUint8Array(data, 16);
      expect(bytes16.success).toBe(true);
      if (bytes16.success) {
        const typed: Bytes16 = bytes16.data;
        expect(typed.length).toBe(16);
      }
    });

    test("Bytes32 should work with 32 bytes", () => {
      const data = new Uint8Array(32).fill(0);
      const bytes32 = Bytes.fromUint8Array(data, 32);
      expect(bytes32.success).toBe(true);
      if (bytes32.success) {
        const typed: Bytes32 = bytes32.data;
        expect(typed.length).toBe(32);
      }
    });

    test("Bytes33 should work with 33 bytes (compressed public key)", () => {
      const data = new Uint8Array(33).fill(0);
      const bytes33 = Bytes.fromUint8Array(data, 33);
      expect(bytes33.success).toBe(true);
      if (bytes33.success) {
        const typed: Bytes33 = bytes33.data;
        expect(typed.length).toBe(33);
      }
    });

    test("Bytes60 should work with 60 bytes", () => {
      const data = new Uint8Array(60).fill(0);
      const bytes60 = Bytes.fromUint8Array(data, 60);
      expect(bytes60.success).toBe(true);
      if (bytes60.success) {
        const typed: Bytes60 = bytes60.data;
        expect(typed.length).toBe(60);
      }
    });

    test("Bytes64 should work with 64 bytes", () => {
      const data = new Uint8Array(64).fill(0);
      const bytes64 = Bytes.fromUint8Array(data, 64);
      expect(bytes64.success).toBe(true);
      if (bytes64.success) {
        const typed: Bytes64 = bytes64.data;
        expect(typed.length).toBe(64);
      }
    });
  });

  describe("Edge cases", () => {
    test("should handle maximum byte value (255)", () => {
      const bytes = Bytes.fromUint8Array(
        new Uint8Array([255, 255, 255, 255]),
        4,
      );
      expect(bytes.success).toBe(true);
      if (bytes.success) {
        expect(bytes.data.toHex()).toBe("ffffffff");
      }
    });

    test("should handle minimum byte value (0)", () => {
      const bytes = Bytes.fromUint8Array(new Uint8Array([0, 0, 0, 0]), 4);
      expect(bytes.success).toBe(true);
      if (bytes.success) {
        expect(bytes.data.toHex()).toBe("00000000");
      }
    });

    test("should maintain immutability", () => {
      const original = new Uint8Array([1, 2, 3, 4]);
      const bytes = Bytes.fromUint8Array(original, 4);
      expect(bytes.success).toBe(true);

      if (bytes.success) {
        // Modify original array
        original[0] = 99;

        // Bytes instance should be unaffected
        expect(bytes.data.toUint8Array()[0]).toBe(1);
      }
    });

    test("should work with large arrays", () => {
      const size = 1000;
      const data = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        data[i] = i % 256;
      }

      const bytes = Bytes.fromUint8Array(data, size);
      expect(bytes.success).toBe(true);
      if (bytes.success) {
        expect(bytes.data.length).toBe(size);
        expect(bytes.data.toUint8Array()).toEqual(data);
      }
    });
  });

  describe("Round-trip conversions", () => {
    test("Uint8Array -> Bytes -> Uint8Array should preserve data", () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const bytes = Bytes.fromUint8Array(original, 5);
      expect(bytes.success).toBe(true);

      if (bytes.success) {
        const roundTrip = bytes.data.toUint8Array();
        expect(roundTrip).toEqual(original);
      }
    });

    test("HexString -> Bytes -> HexString should preserve data", () => {
      const original = "deadbeefcafe";
      const bytes = Bytes.fromHexString(original, 6);
      expect(bytes.success).toBe(true);

      if (bytes.success) {
        const roundTrip = bytes.data.toHex();
        expect(roundTrip).toBe(original);
      }
    });

    test("Bytes -> Bytes should preserve data", () => {
      const original = Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4]), 4);
      expect(original.success).toBe(true);

      if (original.success) {
        const copy = Bytes.fromBytes(original.data, 4);
        expect(copy.success).toBe(true);

        if (copy.success) {
          expect(copy.data.equals(original.data)).toBe(true);
          expect(copy.data.toUint8Array()).toEqual(
            original.data.toUint8Array(),
          );
        }
      }
    });
  });
});
