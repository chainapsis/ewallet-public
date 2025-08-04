import type { RpcTransactionRequest } from "viem";
import {
  hashMessage,
  hashTypedData,
  isAddressEqual,
  recoverAddress,
  recoverTransactionAddress,
  toHex,
  parseEther,
} from "viem";
import { sepolia, mainnet, hardhat } from "viem/chains";

import { hardhatAccounts } from "./hardhat";
import {
  createChainParam,
  createProviderOptions,
  createTypedData,
  createEthSigner,
} from "./utils";
import {
  MockRpcServer,
  createMockRpcServer,
  mockMainnetRpc,
  mockSepoliaRpc,
  mockFailingRpc,
} from "./mock";
import type { EthSigner } from "@keplr-ewallet-sdk-eth/types";
import { initEWalletEIP1193Provider } from "@keplr-ewallet-sdk-eth/provider";
import { ErrorCodes } from "@keplr-ewallet-sdk-eth/errors";

describe("EWallet Provider - Mock RPC Testing", () => {
  let mockServer: MockRpcServer;

  beforeEach(() => {
    mockServer = createMockRpcServer();
  });

  afterEach(() => {
    mockServer.restore();
  });

  describe("Signing Operations", () => {
    let golf: EthSigner;
    let hotel: EthSigner;

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

      const provider = await initEWalletEIP1193Provider(
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
        params: [hexMessage, golf.address],
      });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");

      const recoveredAddress = await recoverAddress({
        hash: hashMessage(message),
        signature,
      });

      expect(isAddressEqual(recoveredAddress, golf.address)).toBe(true);
    });

    it("should successfully perform eth_signTypedData_v4", async () => {
      // Setup mock RPC for signing tests
      const { url: mainnetUrl, config: mainnetConfig } = mockMainnetRpc();
      mockServer.setup({
        [mainnetUrl]: mainnetConfig,
      });

      const provider = await initEWalletEIP1193Provider(
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
        params: [golf.address, typedData],
      });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");

      const recoveredAddress = await recoverAddress({
        hash,
        signature,
      });

      expect(isAddressEqual(recoveredAddress, golf.address)).toBe(true);
    });

    it("should successfully perform eth_signTransaction", async () => {
      // Setup mock RPC for signing tests
      const { url: mainnetUrl, config: mainnetConfig } = mockMainnetRpc();
      mockServer.setup({
        [mainnetUrl]: mainnetConfig,
      });

      const provider = await initEWalletEIP1193Provider(
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
        from: golf.address,
        to: hotel.address,
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

      expect(isAddressEqual(recoveredAddress, golf.address)).toBe(true);
    });
  });

  describe("Chain Validation", () => {
    it("should successfully validate chain with mock RPC", async () => {
      // Setup mock RPC server BEFORE creating provider
      const { url: mainnetUrl, config: mainnetConfig } = mockMainnetRpc();
      mockServer.setup({
        [mainnetUrl]: mainnetConfig,
      });

      // Create provider with mock RPC URL
      const mockChainParam = {
        ...createChainParam(mainnet),
        rpcUrls: [mainnetUrl],
      };

      const provider = await initEWalletEIP1193Provider(
        createProviderOptions([mockChainParam]),
      );

      // Provider should be initialized and validated
      expect(provider.chainId).toBe(toHex(mainnet.id));
      expect(provider.isConnected).toBe(true);

      // Get validation state
      const addedChains = (provider as any).addedChains;
      expect(addedChains[0].validationStatus).toBe("valid");
    });

    it("should fail with network failures using mock RPC", async () => {
      // Setup failing mock RPC BEFORE creating provider
      const { url: failingUrl, config: failingConfig } = mockFailingRpc();
      mockServer.setup({
        [failingUrl]: failingConfig,
      });

      const mockChainParam = {
        ...createChainParam(mainnet),
        rpcUrls: [failingUrl],
      };

      // Provider initialization should fail
      await expect(
        initEWalletEIP1193Provider(createProviderOptions([mockChainParam])),
      ).rejects.toThrow("No valid chains found during provider initialization");
    });

    it("should fail when detecting chainId mismatch with mock RPC", async () => {
      // Setup mock RPC that returns wrong chainId BEFORE creating provider
      const mockUrl = "https://fake-mainnet-but-returns-sepolia.com";
      mockServer.setup({
        [mockUrl]: { chainId: toHex(sepolia.id) }, // Returns sepolia ID instead of mainnet
      });

      const mockChainParam = {
        ...createChainParam(mainnet), // Expects mainnet
        rpcUrls: [mockUrl],
      };

      // Provider initialization should fail due to chainId mismatch
      await expect(
        initEWalletEIP1193Provider(createProviderOptions([mockChainParam])),
      ).rejects.toThrow("No valid chains found during provider initialization");
    });

    it("should successfully handle multiple chains with different mock responses", async () => {
      // Setup multiple mock RPCs BEFORE creating provider
      const { url: mainnetUrl, config: mainnetConfig } = mockMainnetRpc();
      const { url: sepoliaUrl, config: sepoliaConfig } = mockSepoliaRpc();

      mockServer.setup({
        [mainnetUrl]: mainnetConfig,
        [sepoliaUrl]: sepoliaConfig,
      });

      const mainnetChain = {
        ...createChainParam(mainnet),
        rpcUrls: [mainnetUrl],
      };

      const sepoliaChain = {
        ...createChainParam(sepolia),
        rpcUrls: [sepoliaUrl],
      };

      const provider = await initEWalletEIP1193Provider(
        createProviderOptions([mainnetChain, sepoliaChain]),
      );

      // Both chains should be validated during initialization
      const addedChains = (provider as any).addedChains;
      expect(addedChains[0].validationStatus).toBe("valid"); // mainnet
      expect(addedChains[1].validationStatus).toBe("valid"); // sepolia

      // Should start with mainnet (first chain)
      expect(provider.chainId).toBe(toHex(mainnet.id));

      // Switch to sepolia should work
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHex(sepolia.id) }],
      });

      expect(provider.chainId).toBe(toHex(sepolia.id));
    });

    it("should fail with RPC error responses", async () => {
      // Setup mock RPC that returns error BEFORE creating provider
      const errorUrl = "https://mock-rpc-error.com";
      mockServer.simulateRpcError(errorUrl, -32000, "Server error");

      const mockChainParam = {
        ...createChainParam(mainnet),
        rpcUrls: [errorUrl],
      };

      // Provider initialization should fail
      await expect(
        initEWalletEIP1193Provider(createProviderOptions([mockChainParam])),
      ).rejects.toThrow("No valid chains found during provider initialization");
    });

    it("should successfully handle delayed responses", async () => {
      // Setup mock RPC with delay BEFORE creating provider
      const delayedUrl = "https://mock-slow-rpc.com";
      mockServer.setup({
        [delayedUrl]: {
          chainId: toHex(mainnet.id),
          delay: 50, // 50ms delay
        },
      });

      const mockChainParam = {
        ...createChainParam(mainnet),
        rpcUrls: [delayedUrl],
      };

      const start = performance.now();
      const provider = await initEWalletEIP1193Provider(
        createProviderOptions([mockChainParam]),
      );
      const end = performance.now();

      // Should take at least the delay time
      expect(end - start).toBeGreaterThanOrEqual(45);

      const addedChains = (provider as any).addedChains;
      expect(addedChains[0].validationStatus).toBe("valid");
    });
  });

  describe("Network Simulation", () => {
    it("should successfully handle dynamic mock configuration changes", async () => {
      const dynamicUrl = "https://dynamic-mock.com";

      // Initially setup as working
      mockServer.setup({
        [dynamicUrl]: { chainId: toHex(mainnet.id) },
      });

      const provider = await initEWalletEIP1193Provider(
        createProviderOptions([
          {
            ...createChainParam(mainnet),
            rpcUrls: [dynamicUrl],
          },
        ]),
      );

      // First provider should be initialized successfully
      expect(provider.chainId).toBe(toHex(mainnet.id));
      let addedChains = (provider as any).addedChains;
      expect(addedChains[0].validationStatus).toBe("valid");

      // Change mock to fail
      mockServer.simulateFailure(dynamicUrl);

      // Create new provider (simulating restart) - should now fail
      await expect(
        initEWalletEIP1193Provider(
          createProviderOptions([
            {
              ...createChainParam(mainnet),
              rpcUrls: [dynamicUrl],
            },
          ]),
        ),
      ).rejects.toThrow("No valid chains found during provider initialization");
    });

    it("should successfully handle disconnect and reconnect events", async () => {
      const dynamicUrl = "https://disconnect-reconnect-test.com";

      // Setup working mock initially
      mockServer.setup({
        [dynamicUrl]: { chainId: toHex(mainnet.id) },
      });

      const provider = await initEWalletEIP1193Provider(
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
      await provider.request({ method: "eth_chainId" });
      expect(events).toHaveLength(0); // No events, already connected

      // Change mock to simulate network failure
      mockServer.simulateFailure(dynamicUrl);

      // Second request should fail and trigger disconnect
      await expect(
        provider.request({ method: "eth_chainId" }),
      ).rejects.toMatchObject({
        code: ErrorCodes.rpc.resourceUnavailable,
      });

      // Should have disconnect event
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("disconnect");

      // Restore working mock
      mockServer.setup({
        [dynamicUrl]: { chainId: toHex(mainnet.id) },
      });

      // Third request should succeed and trigger reconnect
      await provider.request({ method: "eth_chainId" });

      // Should have connect event now
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe("connect");
      expect(events[1].data).toMatchObject({
        chainId: toHex(mainnet.id),
      });
    });
  });
});
