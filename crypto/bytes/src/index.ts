import type { Result } from "@keplr-ewallet-bytes/utils";

const HEX_STRING_REGEX = new RegExp("^[0-9a-fA-F]*$");

// Type definition for a fixed-length byte array
export class Bytes<N extends number> {
  private readonly _bytes: Buffer;
  readonly length: N;

  private constructor(bytes: Uint8Array, length: N) {
    if (bytes.length !== length) {
      throw new Error(
        `Invalid length. Expected: ${length}, Actual: ${bytes.length}`,
      );
    }
    this._bytes = Buffer.from(bytes);
    this.length = length;
  }

  /**
   * Creates a fixed-length Bytes instance from a Uint8Array.
   * @param uint8Array Uint8Array input
   * @param length Fixed length of the Bytes instance to create
   * @returns A Bytes instance with the specified fixed length
   */
  static fromUint8Array<T extends number>(
    uint8Array: Uint8Array,
    length: T,
  ): Result<Bytes<T>, string> {
    if (uint8Array.length !== length) {
      return {
        success: false,
        err: `Invalid length. Expected: ${length}, Actual: ${uint8Array.length}`,
      };
    }
    return {
      success: true,
      data: new Bytes(uint8Array, length),
    };
  }

  /**
   * Creates a fixed-length Bytes instance from a hexadecimal string.
   * @param hexString Hexadecimal string input
   * @param length Fixed length of the Bytes instance to create
   * @returns A Bytes instance with the specified fixed length
   */
  static fromHexString<T extends number>(
    hexString: string,
    length: T,
  ): Result<Bytes<T>, string> {
    if (!HEX_STRING_REGEX.test(hexString) || hexString.length !== length * 2) {
      return {
        success: false,
        err: "Invalid hexadecimal string format.",
      };
    }
    const uint8Array = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      uint8Array[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return {
      success: true,
      data: new Bytes(uint8Array, length),
    };
  }

  /**
   * Creates a fixed-length Bytes instance from another Bytes instance.
   * @param bytes Bytes instance input
   * @param length Fixed length of the Bytes instance to create
   * @returns A Bytes instance with the specified fixed length
   */
  static fromBytes<T extends number>(
    bytes: Bytes<any>,
    length: T,
  ): Result<Bytes<T>, string> {
    if (bytes.length !== length) {
      return {
        success: false,
        err: `Invalid length. Expected: ${length}, Actual: ${bytes.length}`,
      };
    }
    return {
      success: true,
      data: new Bytes(bytes.toUint8Array(), length),
    };
  }

  /**
   * Compares the current Bytes instance with another Bytes instance.
   * @param other The other Bytes instance to compare with
   * @returns True if both instances are identical, false otherwise
   */
  equals(other: Bytes<N>): boolean {
    if (this.length !== other.length) {
      return false;
    }
    for (let i = 0; i < this.length; i++) {
      if (this._bytes[i] !== other._bytes[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the internal Uint8Array of the Bytes instance.
   * @returns A copy of the internal Uint8Array
   */
  toUint8Array(): Uint8Array {
    return new Uint8Array(this._bytes);
  }

  /**
   * Converts the Bytes instance to a Buffer.
   * @returns A Buffer instance
   */
  toBuffer(): Buffer {
    return this._bytes;
  }

  /**
   * Converts the Bytes instance to a hexadecimal string.
   * @returns Hexadecimal string
   */
  toHex(): string {
    return this._bytes.toString("hex");
  }
}

// Type aliases for commonly used byte lengths
export type Byte = Bytes<1>;
export type Bytes16 = Bytes<16>;
export type Bytes32 = Bytes<32>;
export type Bytes33 = Bytes<33>; // e.g. compressed public key
export type Bytes60 = Bytes<60>; // 32bytes ciphertext + 12 bytes iv + 16 bytes tag
export type Bytes64 = Bytes<64>;
export type BytesN = Bytes<number>;
