import type { RpcTransactionRequest } from "viem";
import {
  hashMessage,
  hashTypedData,
  isAddressEqual,
  parseEther,
  recoverAddress,
  recoverTransactionAddress,
  toHex,
} from "viem";
import { hardhat, mainnet } from "viem/chains";

import { hardhatAccounts } from "./hardhat";
import {
  createMockRpcServer,
  createMockSigner,
  type MockRpcServer,
  mockMainnetRpc,
} from "./mock";
import {
  createChainParam,
  createEthSigner,
  createProviderOptions,
  createTypedData,
} from "./utils";
import {
  OkoEIP1193Provider,
  ProviderRpcErrorCode,
  RpcErrorCode,
} from "@oko-wallet-sdk-eth/provider";
import type { OkoEthSigner } from "@oko-wallet-sdk-eth/types";

describe("Oko Provider - Mock RPC Testing", () => {
  let mockServer: MockRpcServer;

  beforeEach(() => {
    mockServer = createMockRpcServer();
  });

  afterEach(() => {
    mockServer.restore();
  });

  describe("Signing Operations", () => {
    let golf: OkoEthSigner;
    let hotel: OkoEthSigner;

    beforeAll(async () => {
      // Use accounts 6, 7 for mock.test.ts to avoid conflicts with other test files
      golf = createEthSigner(hardhat.id, hardhatAccounts[6].privateKey);
      hotel = createEthSigner(hardhat.id, hardhatAccounts[7].privateKey);
    });

    it("should successfully perform personal_sign", async () => {
      // Setup mock RPC for signing tests
      const { url: mainnetUrl, config: mainnetConfig } = mockMainnetRpc();
      mockServer.setup({
        [mainnetUrl]: mainnetConfig,
      });

      const provider = new OkoEIP1193Provider(
        createProviderOptions(
          [
            {
              ...createChainParam(mainnet),
              rpcUrls: [mainnetUrl],
            },
          ],
          golf,
        ),
      );

      const message = "Hello, world!";
      const hexMessage = toHex(message);

      const signature = await provider.request({
        method: "personal_sign",
        params: [hexMessage, golf.getAddress()!],
      });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");

      const recoveredAddress = await recoverAddress({
        hash: hashMessage(message),
        signature,
      });

      expect(isAddressEqual(recoveredAddress, golf.getAddress()!)).toBe(true);
    });

    it("should successfully perform eth_signTypedData_v4", async () => {
      // Setup mock RPC for signing tests
      const { url: mainnetUrl, config: mainnetConfig } = mockMainnetRpc();
      mockServer.setup({
        [mainnetUrl]: mainnetConfig,
      });

      const provider = new OkoEIP1193Provider(
        createProviderOptions(
          [
            {
              ...createChainParam(mainnet),
              rpcUrls: [mainnetUrl],
            },
          ],
          golf,
        ),
      );

      const typedData = createTypedData();

      const hash = hashTypedData(typedData);

      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [golf.getAddress()!, typedData],
      });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");

      const recoveredAddress = await recoverAddress({
        hash,
        signature,
      });

      expect(isAddressEqual(recoveredAddress, golf.getAddress()!)).toBe(true);
    });

    it("should successfully perform eth_signTransaction", async () => {
      // Setup mock RPC for signing tests
      const { url: mainnetUrl, config: mainnetConfig } = mockMainnetRpc();
      mockServer.setup({
        [mainnetUrl]: mainnetConfig,
      });

      const provider = new OkoEIP1193Provider(
        createProviderOptions(
          [
            {
              ...createChainParam(mainnet),
              rpcUrls: [mainnetUrl],
            },
          ],
          golf,
        ),
      );

      const transaction: RpcTransactionRequest = {
        from: golf.getAddress()!,
        to: hotel.getAddress()!,
        value: toHex(parseEther("0.001")),
        gas: toHex(21000),
        maxFeePerGas: toHex(10000000),
        maxPriorityFeePerGas: toHex(10000000),
        nonce: toHex(0),
        data: "0x",
      };

      const signedTransaction = await provider.request({
        method: "eth_signTransaction",
        params: [transaction],
      });

      expect(signedTransaction).toBeDefined();
      expect(typeof signedTransaction).toBe("string");
      expect(signedTransaction).toMatch(/^0x02[a-fA-F0-9]+$/); // EIP-1559 transaction

      const recoveredAddress = await recoverTransactionAddress({
        serializedTransaction: signedTransaction as `0x02${string}`,
      });

      expect(isAddressEqual(recoveredAddress, golf.getAddress()!)).toBe(true);
    });
  });

  describe("Network Simulation", () => {
    it("should successfully handle disconnect and reconnect events (public rpc)", async () => {
      const dynamicUrl = "https://disconnect-reconnect-test.com";

      // Setup working mock initially
      mockServer.setup({
        [dynamicUrl]: { chainId: toHex(mainnet.id) },
      });

      const provider = new OkoEIP1193Provider(
        createProviderOptions([
          {
            ...createChainParam(mainnet),
            rpcUrls: [dynamicUrl],
          },
        ]),
      );

      // Track events
      const events: Array<{ type: string; data?: any }> = [];
      provider.on("connect", (data) => events.push({ type: "connect", data }));
      provider.on("disconnect", (error) =>
        events.push({ type: "disconnect", data: error }),
      );

      // Clear events array since initialization events already fired
      events.length = 0;

      // First request should succeed (no additional connect event)
      await provider.request({ method: "eth_blockNumber" });
      expect(events).toHaveLength(0); // No events, already connected

      // Change mock to simulate network failure
      mockServer.simulateFailure(dynamicUrl);

      // Second request should fail and trigger disconnect
      await expect(
        provider.request({ method: "eth_blockNumber" }),
      ).rejects.toMatchObject({
        code: RpcErrorCode.ResourceUnavailable,
      });

      // Should have disconnect event
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("disconnect");

      // Restore working mock
      mockServer.simulateSuccess(dynamicUrl);

      // Third request should succeed and trigger reconnect
      await provider.request({ method: "eth_blockNumber" });

      // Should have connect event now
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe("connect");
      expect(events[1].data).toMatchObject({
        chainId: toHex(mainnet.id),
      });
    });

    it("should successfully handle disconnect and reconnect events (wallet rpc with mock signer)", async () => {
      const dynamicUrl = "https://disconnect-reconnect-test.com";

      // Setup working mock initially
      mockServer.setup({
        [dynamicUrl]: { chainId: toHex(mainnet.id) },
      });

      const provider = new OkoEIP1193Provider(
        createProviderOptions(
          [
            {
              ...createChainParam(mainnet),
              rpcUrls: [dynamicUrl],
            },
          ],
          createMockSigner(),
        ),
      );

      // Track events
      const events: Array<{ type: string; data?: any }> = [];
      provider.on("connect", (data) => events.push({ type: "connect", data }));
      provider.on("disconnect", (error) =>
        events.push({ type: "disconnect", data: error }),
      );

      // Clear events array since initialization events already fired
      events.length = 0;

      // First request should succeed (no additional connect event)
      await provider.request({ method: "eth_blockNumber" });
      expect(events).toHaveLength(0); // No events, already connected

      // Change mock to simulate network failure
      mockServer.simulateFailure(dynamicUrl);

      // Second request should fail and trigger disconnect
      await expect(
        provider.request({ method: "eth_blockNumber" }),
      ).rejects.toMatchObject({
        code: RpcErrorCode.ResourceUnavailable,
      });

      // Should have disconnect event
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("disconnect");

      mockServer.simulateSuccess(dynamicUrl);

      // Third request should succeed and trigger reconnect
      await provider.request({ method: "eth_accounts" });

      // Should have connect event now
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe("connect");
      expect(events[1].data).toMatchObject({
        chainId: toHex(mainnet.id),
      });
    });

    it("should not emit connect event if there's no signer", async () => {
      const dynamicUrl = "https://disconnect-reconnect-test.com";

      mockServer.setup({
        [dynamicUrl]: { chainId: toHex(mainnet.id) },
      });

      const provider = new OkoEIP1193Provider(
        createProviderOptions([
          {
            ...createChainParam(mainnet),
            rpcUrls: [dynamicUrl],
          },
        ]),
      );

      const events: Array<{ type: string; data?: any }> = [];
      provider.on("connect", (data) => events.push({ type: "connect", data }));
      provider.on("disconnect", (error) =>
        events.push({ type: "disconnect", data: error }),
      );

      events.length = 0;

      mockServer.simulateFailure(dynamicUrl);

      await expect(
        provider.request({ method: "eth_blockNumber" }),
      ).rejects.toMatchObject({
        code: RpcErrorCode.ResourceUnavailable,
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("disconnect");

      mockServer.simulateSuccess(dynamicUrl);

      // there's no signer, so provider won't emit connect event
      await expect(
        provider.request({
          method: "personal_sign",
          params: [toHex("Hello"), createMockSigner().getAddress()!],
        }),
      ).rejects.toMatchObject({
        code: ProviderRpcErrorCode.Unauthorized,
        message: expect.stringContaining("Signer is required"),
      });

      expect(events).toHaveLength(1);
    });
  });
});
