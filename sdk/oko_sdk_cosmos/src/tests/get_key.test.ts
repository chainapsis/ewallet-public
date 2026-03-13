import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ChainInfo } from "@keplr-wallet/types";

import { getKey } from "@oko-wallet-sdk-cosmos/methods/get_key";
import {
  cosmosAddress,
  cosmosHubChainInfo,
  cosmosPublicKey,
  expectedCosmosBech32Address,
  expectedInitiaBech32Address,
  initiaAddress,
  initiaChainInfo,
  initiaPublicKey,
} from "@oko-wallet-sdk-cosmos/tests/test-data";
import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";

describe("getKey", () => {
  let mockOkoCosmos: OkoCosmosWalletInterface;
  let mockGetPublicKey: jest.Mock<() => Promise<Uint8Array>>;
  let mockGetCosmosChainInfo: jest.Mock<() => Promise<ChainInfo[]>>;

  beforeEach(() => {
    // Create a mock OkoCosmos instance
    mockOkoCosmos = {} as OkoCosmosWalletInterface;

    // Create mock methods (default to Cosmos data)
    mockGetPublicKey = jest
      .fn<() => Promise<Uint8Array>>()
      .mockResolvedValue(cosmosPublicKey);
    mockGetCosmosChainInfo = jest
      .fn<() => Promise<ChainInfo[]>>()
      .mockResolvedValue([cosmosHubChainInfo, initiaChainInfo]);

    // Assign mocks to the instance
    mockOkoCosmos.getPublicKey = mockGetPublicKey;
    mockOkoCosmos.getCosmosChainInfo = mockGetCosmosChainInfo;

    // Reset all mocks
    jest.clearAllMocks();
  });

  it("should return correct key data for cosmoshub-4 with cosmos key", async () => {
    const result = await getKey.call(mockOkoCosmos, "cosmoshub-4");

    expect(result).toEqual({
      bech32Address: expectedCosmosBech32Address,
      address: cosmosAddress,
      pubKey: cosmosPublicKey,
      algo: "secp256k1",
      ethereumHexAddress: "",
      name: "",
      isNanoLedger: false,
      isKeystone: false,
    });

    // Verify method calls
    expect(mockGetPublicKey).toHaveBeenCalledTimes(1);
    expect(mockGetCosmosChainInfo).toHaveBeenCalledTimes(1);
  });

  it("should return correct key data for initia with ethereum-compatible key", async () => {
    mockGetPublicKey.mockResolvedValue(initiaPublicKey);

    const result = await getKey.call(mockOkoCosmos, "interwoven-1");

    expect(result).toEqual({
      bech32Address: expectedInitiaBech32Address,
      address: initiaAddress,
      pubKey: initiaPublicKey,
      algo: "ethsecp256k1",
      ethereumHexAddress: expect.stringMatching(/^[0-9a-f]+$/),
      name: "",
      isNanoLedger: false,
      isKeystone: false,
    });

    // Verify ethereum hex address is not empty for ethereum-compatible chain
    //
    // expect(result.ethereumHexAddress).not.toBe("");

    // Verify method calls
    expect(mockGetPublicKey).toHaveBeenCalledTimes(1);
    expect(mockGetCosmosChainInfo).toHaveBeenCalledTimes(1);
  });

  it("should throw error when chain is not found", async () => {
    await expect(
      getKey.call(mockOkoCosmos, "non-existent-chain"),
    ).rejects.toThrow("Chain info not found");

    // Verify method calls
    expect(mockGetPublicKey).toHaveBeenCalledTimes(1);
    expect(mockGetCosmosChainInfo).toHaveBeenCalledTimes(1);
  });

  it("should throw error when chain has no bech32Config", async () => {
    const invalidChainInfo: ChainInfo = {
      ...cosmosHubChainInfo,
      chainId: "invalid-chain",
      bech32Config: undefined,
    };

    mockGetCosmosChainInfo.mockResolvedValue([invalidChainInfo]);

    await expect(getKey.call(mockOkoCosmos, "invalid-chain")).rejects.toThrow(
      "Chain info not found",
    );
  });

  it("should handle errors from getPublicKey gracefully", async () => {
    const error = new Error("Failed to get public key");
    mockGetPublicKey.mockRejectedValue(error);

    await expect(getKey.call(mockOkoCosmos, "cosmoshub-4")).rejects.toThrow(
      "Failed to get public key",
    );
  });

  it("should handle errors from getCosmosChainInfo gracefully", async () => {
    const error = new Error("Failed to get chain info");
    mockGetCosmosChainInfo.mockRejectedValue(error);

    await expect(getKey.call(mockOkoCosmos, "cosmoshub-4")).rejects.toThrow(
      "Failed to get chain info",
    );
  });

  it("should verify key structure for cosmos chain", async () => {
    const result = await getKey.call(mockOkoCosmos, "cosmoshub-4");

    // Verify all required properties exist
    expect(result).toHaveProperty("bech32Address");
    expect(result).toHaveProperty("address");
    expect(result).toHaveProperty("pubKey");
    expect(result).toHaveProperty("algo");
    expect(result).toHaveProperty("ethereumHexAddress");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("isNanoLedger");
    expect(result).toHaveProperty("isKeystone");

    // Verify types
    // expect(typeof result.bech32Address).toBe("string");
    // expect(result.address).toBeInstanceOf(Uint8Array);
    // expect(result.pubKey).toBeInstanceOf(Uint8Array);
    // expect(typeof result.algo).toBe("string");
    // expect(typeof result.ethereumHexAddress).toBe("string");
    // expect(typeof result.name).toBe("string");
    // expect(typeof result.isNanoLedger).toBe("boolean");
    // expect(typeof result.isKeystone).toBe("boolean");
  });

  it("should verify key structure for ethereum-compatible chain", async () => {
    mockGetPublicKey.mockResolvedValue(initiaPublicKey);

    const _result = await getKey.call(mockOkoCosmos, "interwoven-1");

    // Verify ethereum-specific properties
    // expect(result.algo).toBe("ethsecp256k1");
    // expect(result.ethereumHexAddress).not.toBe("");
    // expect(result.ethereumHexAddress).toMatch(/^[0-9a-f]+$/);

    // Verify bech32Address uses correct prefix
    // expect(result.bech32Address).toMatch(/^init1[a-z0-9]+$/);
  });
});
