import type { AddEthereumChainParameter } from "viem";
import { toHex } from "viem";
import { mainnet, sepolia } from "viem/chains";

import {
  createMockRpcServer,
  createMockSigner,
  MOCK_ADDRESS,
  MOCK_SIGNATURE,
  type MockRpcServer,
  mockMainnetRpc,
} from "./mock";
import {
  createChainParam,
  createProviderOptions,
  EXPECTED_NAME,
  EXPECTED_VERSION,
} from "./utils";
import {
  OkoEIP1193Provider,
  ProviderRpcErrorCode,
  RpcErrorCode,
} from "@oko-wallet-sdk-eth/provider";
import { ProviderEventEmitter } from "@oko-wallet-sdk-eth/provider/emitter";

describe("Oko Provider - Base", () => {
  describe("Basic Properties", () => {
    let provider: OkoEIP1193Provider;
    let mockServer: MockRpcServer;

    beforeEach(() => {
      // Use mock RPC for basic property tests
      mockServer = createMockRpcServer();
      const { url: mainnetUrl, config: mainnetConfig } = mockMainnetRpc();
      mockServer.setup({
        [mainnetUrl]: mainnetConfig,
      });

      const mockChainParam = {
        ...createChainParam(mainnet),
        rpcUrls: [mainnetUrl],
      };

      provider = new OkoEIP1193Provider(
        createProviderOptions([mockChainParam]),
      );
    });

    afterEach(() => {
      mockServer.restore();
    });

    it("should initialize with correct properties", () => {
      expect(OkoEIP1193Provider).toBeDefined();
      expect(provider.chainId).toBe(toHex(mainnet.id));
      expect(provider.isConnected).toBe(true);
      expect(provider.name).toBe(EXPECTED_NAME);
    });

    it("should be instance of ProviderEventEmitter", () => {
      expect(provider).toBeInstanceOf(ProviderEventEmitter);
    });
  });

  describe("EIP1193 Interface", () => {
    let provider: OkoEIP1193Provider;
    let mockServer: MockRpcServer;

    beforeEach(() => {
      // Use mock RPC for interface tests
      mockServer = createMockRpcServer();
      const { url: mainnetUrl, config: mainnetConfig } = mockMainnetRpc();
      mockServer.setup({
        [mainnetUrl]: mainnetConfig,
      });

      const mockChainParam = {
        ...createChainParam(mainnet),
        rpcUrls: [mainnetUrl],
      };

      provider = new OkoEIP1193Provider(
        createProviderOptions([mockChainParam]),
      );
    });

    afterEach(() => {
      mockServer.restore();
    });

    it("should implement all required EIP1193 in methods", () => {
      expect(provider.request).toBeDefined();
      expect(typeof provider.request).toBe("function");
      expect(provider.on).toBeDefined();
      expect(typeof provider.on).toBe("function");
      expect(provider.removeListener).toBeDefined();
      expect(typeof provider.removeListener).toBe("function");
    });

    it("should have correct property types", () => {
      expect(typeof provider.isConnected).toBe("boolean");
      // expect(typeof provider.version).toBe("string");
      expect(typeof provider.chainId).toBe("string");
    });

    it("should satisfy TypeScript type compatibility", () => {
      const _requestCheck: typeof provider.request = provider.request;
      const _onCheck: typeof provider.on = provider.on;
      const _removeCheck: typeof provider.removeListener =
        provider.removeListener;

      expect(_requestCheck).toBe(provider.request);
      expect(_onCheck).toBe(provider.on);
      expect(_removeCheck).toBe(provider.removeListener);
    });
  });

  describe("Request Method Handling", () => {
    describe("Basic RPC Methods", () => {
      let provider: OkoEIP1193Provider;
      let mainnetChainParam: AddEthereumChainParameter;

      beforeEach(() => {
        // Use live RPC for basic RPC method tests
        mainnetChainParam = createChainParam(mainnet);
        provider = new OkoEIP1193Provider(
          createProviderOptions([mainnetChainParam]),
        );
      });

      it("should successfully handle web3_clientVersion request", async () => {
        const result = await provider.request({
          method: "web3_clientVersion",
        });
        expect(result).toBe(`${EXPECTED_NAME}/${EXPECTED_VERSION}`);
      });

      it("should successfully handle eth_chainId request", async () => {
        const result = await provider.request({
          method: "eth_chainId",
        });
        expect(result).toBe(toHex(mainnet.id));
      });

      it("should fail with invalid address parameter", async () => {
        let thrownError: any;

        try {
          await provider.request({
            method: "eth_getBalance",
            params: ["0x123", "latest"],
          });
          expect(true).toBe(false); // Should not reach here
        } catch (error) {
          thrownError = error;
        }

        expect(thrownError).toBeDefined();
        // mainnet throws invalidParams, sepolia throws methodNotFound
        expect([
          RpcErrorCode.InvalidParams,
          RpcErrorCode.MethodNotFound,
        ]).toContain(thrownError.code);
      });

      it("should successfully init provider with signer but no account", async () => {
        const mockSigner = createMockSigner({ noAccount: true });
        const publicProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(mainnet)], mockSigner),
        );

        const accounts = await publicProvider.request({
          method: "eth_accounts",
        });
        expect(accounts).toEqual([]);

        const requestAccounts = await publicProvider.request({
          method: "eth_requestAccounts",
        });
        expect(requestAccounts).toEqual([]);
      });
    });

    describe("Chain Management", () => {
      let provider: OkoEIP1193Provider;
      let mainnetChainParam: AddEthereumChainParameter;

      beforeEach(() => {
        // Use live RPC for chain management tests
        mainnetChainParam = createChainParam(mainnet);
        provider = new OkoEIP1193Provider(
          createProviderOptions([mainnetChainParam]),
        );
      });

      it("should successfully add duplicate chain with valid RPC URL", async () => {
        const result = await provider.request({
          method: "wallet_addEthereumChain",
          params: [mainnetChainParam],
        });
        expect(result).toBeNull();
      });

      it("should successfully add new ethereum chain", async () => {
        const sepoliaChainParam = createChainParam(sepolia);

        // Set up event listeners to track events
        const chainChangedEvents: string[] = [];

        provider.on("chainChanged", (chainId) => {
          chainChangedEvents.push(chainId);
        });

        // Initial state should be mainnet (first chain is connected by default)
        expect(provider.chainId).toBe(toHex(mainnet.id));

        const result = await provider.request({
          method: "wallet_addEthereumChain",
          params: [sepoliaChainParam],
        });

        expect(result).toBeNull(); // wallet_addEthereumChain returns null on success
        expect(provider.chainId).toBe(toHex(mainnet.id)); // should not switch to sepolia

        // Verify chainChanged event was emitted
        expect(chainChangedEvents).toHaveLength(0);
      });

      it("should fail when adding chain with invalid chainId", async () => {
        const invalidChainParam = {
          ...createChainParam(sepolia),
          chainId: "hello world",
        };

        await expect(
          provider.request({
            method: "wallet_addEthereumChain",
            params: [invalidChainParam],
          }),
        ).rejects.toMatchObject({
          code: RpcErrorCode.InvalidInput,
        });
      });

      it("should successfully switch to existing chain", async () => {
        // Initial state should be mainnet
        expect(provider.chainId).toBe(toHex(mainnet.id));

        const sepoliaChainParam = createChainParam(sepolia);
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [sepoliaChainParam],
        });

        // Chain should not switch to sepolia
        expect(provider.chainId).toBe(toHex(mainnet.id));

        // Set up event listeners for switch operation
        const chainChangedEvents: string[] = [];

        provider.on("chainChanged", (chainId) => {
          chainChangedEvents.push(chainId);
        });

        // Then switch to sepolia
        const result = await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHex(sepolia.id) }],
        });

        expect(result).toBeNull(); // wallet_switchEthereumChain returns null on success
        expect(provider.chainId).toBe(toHex(sepolia.id));

        // Verify chainChanged event was emitted
        expect(chainChangedEvents).toContain(toHex(sepolia.id));
      });

      it("should fail when switching to non-existent chain", async () => {
        const nonExistentChainId = toHex(999999); // Chain that was never added

        await expect(
          provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: nonExistentChainId }],
          }),
        ).rejects.toMatchObject({
          code: ProviderRpcErrorCode.UnsupportedChain,
        });
      });

      it("should successfully manage chain state transitions", async () => {
        // Initial state - first chain is connected by default
        expect(provider.chainId).toBe(toHex(mainnet.id));
        expect(provider.isConnected).toBe(true);

        const addedChains = (provider as any).addedChains;
        expect(addedChains).toHaveLength(1);
        expect(addedChains[0].connected).toBe(true);
      });

      it("should successfully handle multi-chain state", async () => {
        const multiProvider = new OkoEIP1193Provider(
          createProviderOptions([
            createChainParam(mainnet),
            createChainParam(sepolia),
          ]),
        );

        // Get initial state
        let addedChains = (multiProvider as any).addedChains;

        // Initially: mainnet active and connected, sepolia added but not connected
        expect(multiProvider.chainId).toBe(toHex(mainnet.id));
        expect(addedChains[0].connected).toBe(true); // mainnet
        expect(addedChains[1].connected).toBe(false); // sepolia

        // Validate mainnet
        await multiProvider.request({ method: "eth_chainId" });

        // Switch to sepolia
        await multiProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHex(sepolia.id) }],
        });

        // Get state after switch
        addedChains = (multiProvider as any).addedChains;

        expect(multiProvider.chainId).toBe(toHex(sepolia.id));
        expect(addedChains[1].connected).toBe(true); // sepolia now connected (active chain)
      });
    });

    describe("Wallet Methods - No Signer", () => {
      it("should successfully handle public RPC methods without signer", async () => {
        const publicProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(mainnet)]),
        );

        // Public methods should work
        const clientVersion = await publicProvider.request({
          method: "web3_clientVersion",
        });
        expect(clientVersion).toContain("OkoEIP1193Provider");

        const chainId = await publicProvider.request({ method: "eth_chainId" });
        expect(chainId).toBe(toHex(mainnet.id));
      });

      it("should successfully handle wallet RPC methods not requiring authenticated signer", async () => {
        const publicProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(mainnet)]),
        );

        const accounts = await publicProvider.request({
          method: "eth_accounts",
        });
        expect(accounts).toEqual([]);

        const requestAccounts = await publicProvider.request({
          method: "eth_requestAccounts",
        });
        expect(requestAccounts).toEqual([]);
      });

      it("should fail with wallet RPC methods without signer", async () => {
        const publicProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(mainnet)]),
        );

        await expect(
          publicProvider.request({
            method: "personal_sign",
            params: [toHex("test"), MOCK_ADDRESS],
          }),
        ).rejects.toMatchObject({
          code: ProviderRpcErrorCode.Unauthorized,
          message: expect.stringContaining("Signer is required"),
        });
      });
    });

    describe("Wallet Methods - With Signer", () => {
      it("should successfully handle wallet RPC methods with signer", async () => {
        const mockSigner = createMockSigner();
        const walletProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(mainnet)], mockSigner),
        );

        const accounts = await walletProvider.request({
          method: "eth_accounts",
        });

        expect(accounts).toBeDefined();
        expect(accounts[0]).toEqual(MOCK_ADDRESS);

        const address = mockSigner.getAddress();
        const signature = await walletProvider.request({
          method: "personal_sign",
          params: [toHex("test"), address!],
        });

        expect(signature).toBeDefined();
        expect(signature).toBe(MOCK_SIGNATURE);
      });

      it("should fail when signer given but no account", async () => {
        const mockSigner = createMockSigner({ noAccount: true });
        const walletProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(mainnet)], mockSigner),
        );

        await expect(
          walletProvider.request({
            method: "personal_sign",
            params: [toHex("test"), MOCK_ADDRESS],
          }),
        ).rejects.toMatchObject({
          code: ProviderRpcErrorCode.Unauthorized,
          message: expect.stringContaining("No authenticated signer"),
        });
      });
    });
  });

  describe("Event System", () => {
    it("should successfully prevent duplicate connect events after initialization", async () => {
      const eventProvider = new OkoEIP1193Provider(
        createProviderOptions([createChainParam(mainnet)]),
      );

      let connectCount = 0;
      eventProvider.on("connect", () => connectCount++);

      // Connect event already fired during initialization (before listener was added)
      // Multiple successful requests should NOT emit additional connect events
      await eventProvider.request({ method: "eth_chainId" });
      await eventProvider.request({ method: "eth_blockNumber" });
      await eventProvider.request({ method: "eth_gasPrice" });

      expect(connectCount).toBe(0); // No additional connect events
    });

    it("should successfully handle multiple event listeners", async () => {
      const provider = new OkoEIP1193Provider(
        createProviderOptions([createChainParam(mainnet)]),
      );

      // Use existing provider and test with actual method calls
      const listener1Events: string[] = [];
      const listener2Events: string[] = [];

      provider.on("chainChanged", (chainId) => {
        listener1Events.push(chainId);
      });

      provider.on("chainChanged", (chainId) => {
        listener2Events.push(chainId);
      });

      // Add chain to trigger chainChanged event
      const sepoliaChainParam = createChainParam(sepolia);
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [sepoliaChainParam],
      });

      // Switch to sepolia
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHex(sepolia.id) }],
      });

      // Both listeners should receive the event
      expect(listener1Events).toHaveLength(1);
      expect(listener1Events[0]).toBe(toHex(sepolia.id));
      expect(listener2Events).toHaveLength(1);
      expect(listener2Events[0]).toBe(toHex(sepolia.id));
    });

    it("should successfully remove event listeners", async () => {
      const provider = new OkoEIP1193Provider(
        createProviderOptions([createChainParam(mainnet)]),
      );

      // Use existing provider and test with actual method calls
      const chainChangedEvents: string[] = [];

      const listener = (chainId: string) => {
        chainChangedEvents.push(chainId);
      };

      provider.on("chainChanged", listener);

      // Add chain to trigger event
      const sepoliaChainParam = createChainParam(sepolia);
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [sepoliaChainParam],
      });

      // Switch to sepolia
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHex(sepolia.id) }],
      });

      expect(chainChangedEvents).toHaveLength(1);
      expect(chainChangedEvents[0]).toBe(toHex(sepolia.id));

      // Remove listener
      provider.removeListener("chainChanged", listener);

      // Switch back to mainnet
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHex(mainnet.id) }],
      });

      // Should still have only the sepolia event, not the mainnet switch
      expect(
        chainChangedEvents.filter((id) => id === toHex(mainnet.id)),
      ).toHaveLength(0);
    });
  });
});
