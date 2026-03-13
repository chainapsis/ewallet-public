import {
  getTransactionType,
  InvalidSerializableTransactionError,
  type RpcTransactionRequest,
  recoverPublicKey,
  serializeTransaction,
} from "viem";
import { serializeSignature } from "viem/accounts";

import {
  encodeEthereumSignature,
  isSignableTransaction,
  publicKeyToEthereumAddress,
  toSignableTransaction,
  toTransactionSerializable,
} from "@oko-wallet-sdk-eth/utils";

describe("publicKeyToEthereumAddress", () => {
  it("should convert compressed public key string to Ethereum address", () => {
    const compressedPublicKey =
      "0x0268d39a99cf77adba08a28877900023513f6e49b702901fb53a90d9c1187e1aa4";
    const expectedAddress = "0xDdbEC09D796225434925b4105c66c24956EBc6cA";

    const address = publicKeyToEthereumAddress(compressedPublicKey);

    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(typeof address).toBe("string");
    expect(address).toBe(expectedAddress);
  });

  it("should convert uncompressed public key string to Ethereum address", () => {
    const uncompressedPublicKey =
      "0x0468d39a99cf77adba08a28877900023513f6e49b702901fb53a90d9c1187e1aa4d4b640ac857c7a6ca794625bd0422b9d7ec90a7e2974ca949eca507ba4719f56";
    const expectedAddress = "0xDdbEC09D796225434925b4105c66c24956EBc6cA";

    const address = publicKeyToEthereumAddress(uncompressedPublicKey);

    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(typeof address).toBe("string");
    expect(address).toBe(expectedAddress);
  });

  it("should convert ByteArray (Uint8Array) public key to Ethereum address", () => {
    const compressedPublicKeyBytes = new Uint8Array([
      0x02, 0x68, 0xd3, 0x9a, 0x99, 0xcf, 0x77, 0xad, 0xba, 0x08, 0xa2, 0x88,
      0x77, 0x90, 0x00, 0x23, 0x51, 0x3f, 0x6e, 0x49, 0xb7, 0x02, 0x90, 0x1f,
      0xb5, 0x3a, 0x90, 0xd9, 0xc1, 0x18, 0x7e, 0x1a, 0xa4,
    ]);
    const expectedAddress = "0xDdbEC09D796225434925b4105c66c24956EBc6cA";

    const address = publicKeyToEthereumAddress(compressedPublicKeyBytes);

    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(typeof address).toBe("string");
    expect(address).toBe(expectedAddress);
  });

  it("should convert Buffer public key to Ethereum address", () => {
    // Compressed public key as Buffer
    const compressedPublicKeyBuffer = Buffer.from(
      "0268d39a99cf77adba08a28877900023513f6e49b702901fb53a90d9c1187e1aa4",
      "hex",
    );
    const expectedAddress = "0xDdbEC09D796225434925b4105c66c24956EBc6cA";

    const address = publicKeyToEthereumAddress(compressedPublicKeyBuffer);

    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(typeof address).toBe("string");
    expect(address).toBe(expectedAddress);
  });

  it("should produce the same address for different input formats of the same public key", () => {
    const compressedHex =
      "0268d39a99cf77adba08a28877900023513f6e49b702901fb53a90d9c1187e1aa4";
    const compressedHexWith0x = `0x${compressedHex}`;
    const compressedBytes = new Uint8Array(Buffer.from(compressedHex, "hex"));
    const compressedBuffer = Buffer.from(compressedHex, "hex");

    const addressFromHex = publicKeyToEthereumAddress(`0x${compressedHex}`);
    const addressFromHexWith0x =
      publicKeyToEthereumAddress(compressedHexWith0x);
    const addressFromBytes = publicKeyToEthereumAddress(compressedBytes);
    const addressFromBuffer = publicKeyToEthereumAddress(compressedBuffer);

    expect(addressFromHex).toBe(addressFromHexWith0x);
    expect(addressFromHex).toBe(addressFromBytes);
    expect(addressFromHex).toBe(addressFromBuffer);
  });
});

describe("encodeEthereumSignature", () => {
  it("should encode the signature correctly", async () => {
    const compressedPublicKey =
      "0268d39a99cf77adba08a28877900023513f6e49b702901fb53a90d9c1187e1aa4";
    const address = publicKeyToEthereumAddress(`0x${compressedPublicKey}`);

    const msgHash =
      "d7ed35dd0510a611f63230dabd98e34dcfca9fda4e086083a0741e50a247249d"; // hashMessage("hello world!")

    const signOutput = {
      sig: {
        big_r:
          "0220FF16EBC6DA287D0C059F809A9F4AC23BC238CF17F4D2F361FBFEFE9ECC0A46",
        s: "59AE4813A391DBA17C3509DA80AF0AA866D16406075202654DD3A17E912C19DF",
      },
      is_high: true,
    };

    const signature = encodeEthereumSignature(signOutput);

    expect(signature).toHaveProperty("r");
    expect(signature).toHaveProperty("s");
    expect(signature).toHaveProperty("v");
    expect(signature.r).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(signature.s).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(typeof signature.v).toBe("bigint");

    const serializedSignature = serializeSignature(signature);

    // recovered public key should be uncompressed
    const recoveredPublicKey = await recoverPublicKey({
      hash: `0x${msgHash}`,
      signature: serializedSignature,
    });

    // 0x04 is the prefix for uncompressed public key
    // length is 128 because it's 64 bytes (32 bytes for x and 32 bytes for y) without hex prefix 0x04
    expect(recoveredPublicKey).toMatch(/^0x04[0-9a-fA-F]{128}$/);

    const recoveredAddress = publicKeyToEthereumAddress(recoveredPublicKey);

    expect(recoveredAddress).toBe(address);
  });
});

describe("toSignableTransaction", () => {
  it("produces signable tx with fee fields and no gasPrice", () => {
    const tx: RpcTransactionRequest = {
      from: "0x0000000000000000000000000000000000000001",
      to: "0x0000000000000000000000000000000000000002",
      gas: "0x5208",
      maxFeePerGas: "0x59682f00",
      maxPriorityFeePerGas: "0x3b9aca00",
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    };

    const signable = toSignableTransaction(tx);

    expect(signable.from).toBeUndefined();
    expect(signable.maxFeePerGas).toBe("0x59682f00");
    expect(signable.maxPriorityFeePerGas).toBe("0x3b9aca00");
    expect(signable.gasPrice).toBeUndefined();
  });

  it("normalizes decimal and bare-hex quantities, and 0x-prefixes data", () => {
    const tx: RpcTransactionRequest = {
      from: "0x0000000000000000000000000000000000000001",
      to: "0x0000000000000000000000000000000000000002",
      type: "0x2",
      gas: "21000" as any,
      maxFeePerGas: "2000000000" as any,
      maxPriorityFeePerGas: "1500000000" as any,
      nonce: "1" as any,
      value: "0" as any,
      data: "abcd" as any,
    };

    const signable = toSignableTransaction(tx);

    expect(signable.gas).toBe("0x5208");
    expect(signable.maxFeePerGas).toBe("0x77359400");
    expect(signable.maxPriorityFeePerGas).toBe("0x59682f00");
    expect(signable.nonce).toBe("0x1");
    expect(signable.value).toBe("0x0");
    expect(signable.data).toBe("0xabcd");
  });

  it("treats bare hex quantity as hex by prefixing 0x", () => {
    const tx: RpcTransactionRequest = {
      from: "0x0000000000000000000000000000000000000001",
      to: "0x0000000000000000000000000000000000000002",
      type: "0x2",
      gas: "ab" as any,
      maxFeePerGas: "0x1",
      maxPriorityFeePerGas: "0x1",
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    };

    const signable = toSignableTransaction(tx);
    expect(signable.gas).toBe("0xab");
  });

  it("strips leading zeros in hex quantities", () => {
    const tx: RpcTransactionRequest = {
      from: "0x0000000000000000000000000000000000000001",
      to: "0x0000000000000000000000000000000000000002",
      type: "0x0",
      gas: "0x0005208" as any, // 0x5208 with leading zeros -> 0x5208
      gasPrice: "0x00000000",
      nonce: "0x0001" as any,
      value: "0x0000" as any,
      data: "0x",
    };

    const signable = toSignableTransaction(tx);
    expect(signable.gas).toBe("0x5208");
    expect(signable.gasPrice).toBe("0x0");
    expect(signable.nonce).toBe("0x1");
    expect(signable.value).toBe("0x0");
  });

  it("sets undefined for truly invalid quantity and fails signable check", () => {
    const tx: RpcTransactionRequest = {
      from: "0x0000000000000000000000000000000000000001",
      to: "0x0000000000000000000000000000000000000002",
      type: "0x0",
      gas: "0x5208",
      gasPrice: "0xZZ" as any, // invalid hex
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    } as any;

    const signable = toSignableTransaction(tx);
    expect(signable.gasPrice).toBeUndefined();
    expect(isSignableTransaction(signable)).toBe(false);
  });

  it("returns undefined for empty string quantities", () => {
    const tx: RpcTransactionRequest = {
      from: "0x0000000000000000000000000000000000000001",
      to: "0x0000000000000000000000000000000000000002",
      type: "0x2",
      gas: "" as any,
      maxFeePerGas: "0x1",
      maxPriorityFeePerGas: "0x1",
      nonce: "" as any,
      value: "" as any,
      data: "0x",
    } as any;

    const signable = toSignableTransaction(tx);
    expect(signable.gas).toBeUndefined();
    expect(signable.nonce).toBeUndefined();
    expect(signable.value).toBeUndefined();
  });
});

describe("isSignableTransaction", () => {
  it("returns true for legacy signable tx", () => {
    const tx: RpcTransactionRequest = {
      to: "0x0000000000000000000000000000000000000002",
      gas: "0x5208",
      gasPrice: "0x3b9aca00",
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    };
    expect(isSignableTransaction(tx)).toBe(true);
  });

  it("returns true for EIP-2930 signable tx", () => {
    const tx: RpcTransactionRequest = {
      to: "0x0000000000000000000000000000000000000002",
      type: "0x1",
      gas: "0x5208",
      gasPrice: "0x3b9aca00",
      accessList: [],
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    };
    expect(isSignableTransaction(tx)).toBe(true);
  });

  it("returns true for EIP-1559 signable tx", () => {
    const tx: RpcTransactionRequest = {
      to: "0x0000000000000000000000000000000000000002",
      type: "0x2",
      gas: "0x5208",
      maxFeePerGas: "0x59682f00",
      maxPriorityFeePerGas: "0x3b9aca00",
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    };
    expect(isSignableTransaction(tx)).toBe(true);
  });

  it("rejects invalid fee field combinations", () => {
    const invalidLegacy: RpcTransactionRequest = {
      type: "0x0",
      gas: "0x5208",
      maxFeePerGas: "0x59682f00",
    } as any;
    const invalid1559_a: RpcTransactionRequest = {
      type: "0x2",
      maxFeePerGas: "0x59682f00",
      gasPrice: "0x3b9aca00",
    } as any;
    const invalid1559_b: RpcTransactionRequest = {
      type: "0x2",
      gas: "0x5208",
      maxPriorityFeePerGas: "0x3b9aca00",
    } as any;

    expect(isSignableTransaction(invalidLegacy)).toBe(false);
    expect(isSignableTransaction(invalid1559_a)).toBe(false);
    expect(isSignableTransaction(invalid1559_b)).toBe(false);
  });
});

describe("toTransactionSerializable", () => {
  it("maps EIP-1559 fee fields and type correctly", () => {
    const tx: RpcTransactionRequest = {
      to: "0x0000000000000000000000000000000000000002",
      gas: "0x5208",
      maxFeePerGas: "0x59682f00",
      maxPriorityFeePerGas: "0x3b9aca00",
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    };

    const s = toTransactionSerializable({ chainId: "0x1", tx });
    expect(s.type).toBe("eip1559");
    expect(s.chainId).toBe(1);
    expect(s.maxFeePerGas).toBe(BigInt("0x59682f00"));
    expect(s.maxPriorityFeePerGas).toBe(BigInt("0x3b9aca00"));
    expect(s.gas).toBe(BigInt("0x5208"));
    expect(s.nonce).toBe(1);
    expect(s.value).toBe(BigInt(0));
    expect(getTransactionType(s)).toBe("eip1559");
    expect(serializeTransaction(s)).toBeDefined();
  });

  it("maps legacy fee field and type correctly", () => {
    const tx: RpcTransactionRequest = {
      to: "0x0000000000000000000000000000000000000002",
      gas: "0x5208",
      gasPrice: "0x3b9aca00",
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    };

    const s = toTransactionSerializable({ chainId: "0x1", tx });
    expect(s.type).toBe("legacy");
    expect(s.gasPrice).toBe(BigInt("0x3b9aca00"));
    expect(s.accessList).toBeUndefined();
    expect(getTransactionType(s)).toBe("legacy");
    expect(serializeTransaction(s)).toBeDefined();
  });

  it("maps EIP-2930 when accessList present with gasPrice", () => {
    const tx: RpcTransactionRequest = {
      to: "0x0000000000000000000000000000000000000002",
      gas: "0x5208",
      gasPrice: "0x3b9aca00",
      accessList: [
        {
          address: "0x0000000000000000000000000000000000000001",
          storageKeys: [],
        },
      ],
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    };

    const s = toTransactionSerializable({ chainId: "0x1", tx });
    expect(s.type).toBe("eip2930");
    expect(Array.isArray(s.accessList)).toBe(true);
    expect(getTransactionType(s)).toBe("eip2930");
    expect(serializeTransaction(s)).toBeDefined();
  });

  it("ignores fee fields when none set (no type)", () => {
    const tx: RpcTransactionRequest = {
      to: "0x0000000000000000000000000000000000000002",
      gas: "0x5208",
      nonce: "0x1",
      value: "0x0",
      data: "0x",
    };

    const s = toTransactionSerializable({ chainId: "0x1", tx });
    expect(s.type).toBeUndefined();
    expect(s.gasPrice).toBeUndefined();
    expect(s.maxFeePerGas).toBeUndefined();
    expect(s.maxPriorityFeePerGas).toBeUndefined();

    const error = new InvalidSerializableTransactionError({ transaction: s });

    expect(() => getTransactionType(s)).toThrow(error);
    expect(() => serializeTransaction(s)).toThrow(error);
  });
});
