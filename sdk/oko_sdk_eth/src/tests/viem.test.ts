import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  hashMessage,
  isAddressEqual,
  parseEther,
  recoverAddress,
  recoverTransactionAddress,
} from "viem";
import { mainnet, sepolia } from "viem/chains";

import { hardhatAccounts, hardhatAlt, hardhatNodeAlt } from "./hardhat";
import {
  COUNTER_ABI,
  COUNTER_DEPLOYMENT_BYTECODE,
  createChainParam,
  createContractHelper,
  createEthSigner,
  createProviderOptions,
  createTransactionHelper,
  createTypedData,
  generateInvalidBytecode,
  generateRandomAddress,
} from "./utils";
import { OkoEIP1193Provider, RpcErrorCode } from "@oko-wallet-sdk-eth/provider";
import type { OkoEthSigner } from "@oko-wallet-sdk-eth/types";

describe("Oko Provider - Viem Integration", () => {
  describe("Public Client - Live RPC", () => {
    let provider: OkoEIP1193Provider;

    beforeAll(() => {
      const mainnetChainParam = createChainParam(mainnet);
      provider = new OkoEIP1193Provider(
        createProviderOptions([mainnetChainParam]),
      );
    });

    it("should successfully work with viem createPublicClient", async () => {
      const client = createPublicClient({
        chain: sepolia,
        transport: custom(provider),
      });

      expect(client).toBeDefined();
      expect(client.transport).toBeDefined();

      const blockNumber = await client.getBlockNumber();
      expect(blockNumber).toBeDefined();
      expect(typeof blockNumber).toBe("bigint");
    });

    it("should fail with unsupported methods", async () => {
      const client = createPublicClient({
        chain: sepolia,
        transport: custom(provider, {
          methods: {
            exclude: ["eth_blockNumber"], // 'eth_blockNumber' is treated as unsupported method by viem
          },
        }),
      });

      await expect(client.getBlockNumber()).rejects.toMatchObject({
        code: RpcErrorCode.MethodNotSupported,
      });
    });
  });

  describe("Hardhat Integration", () => {
    let hardhatProvider: OkoEIP1193Provider;
    let alice: OkoEthSigner;
    let bob: OkoEthSigner;
    let charlie: OkoEthSigner;

    beforeAll(async () => {
      // Use accounts 0, 1, 2 for viem.test.ts to avoid conflicts with other test files
      alice = createEthSigner(hardhatAlt.id, hardhatAccounts[0].privateKey);
      bob = createEthSigner(hardhatAlt.id, hardhatAccounts[1].privateKey);
      charlie = createEthSigner(hardhatAlt.id, hardhatAccounts[2].privateKey);

      try {
        await hardhatNodeAlt.start();
        const hardhatChainParam = createChainParam(hardhatAlt);
        hardhatProvider = new OkoEIP1193Provider(
          createProviderOptions([hardhatChainParam]),
        );
      } catch (error) {
        console.warn("⚠️  Failed to start Hardhat node:", error);
        throw error;
      }
    }, 30000); // Increased timeout to match hardhat startup timeout

    // Stop Hardhat node once after all tests with proper cleanup
    afterAll(async () => {
      try {
        await hardhatNodeAlt.stop();
        // Additional safety: force cleanup if needed
        await hardhatNodeAlt.forceCleanup();
      } catch (error) {
        console.warn("⚠️  Error during Hardhat node cleanup:", error);
        await hardhatNodeAlt.forceCleanup();
      }
    }, 10000); // Timeout for cleanup

    describe("Public Client Operations", () => {
      it("should successfully perform public actions", async () => {
        const client = createPublicClient({
          chain: hardhatAlt,
          transport: custom(hardhatProvider),
        });

        const blockNumber = await client.getBlockNumber();
        expect(blockNumber).toBeDefined();
        expect(typeof blockNumber).toBe("bigint");
        expect(blockNumber).toBeGreaterThanOrEqual(BigInt(0));

        const balance = await client.getBalance({
          address: alice.getAddress()!,
        });

        expect(balance).toBeDefined();
        expect(typeof balance).toBe("bigint");
        // Hardhat gives 10000 ETH to default accounts
        expect(balance).toBeGreaterThan(BigInt(0));

        // genesis block
        const block = await client.getBlock({
          blockNumber: blockNumber,
        });

        expect(block).toBeDefined();
        expect(block.number).toBe(blockNumber);
        expect(block.hash).toBeDefined();

        const blobBaseFee = await client.getBlobBaseFee();
        expect(blobBaseFee).toBeDefined();
        expect(typeof blobBaseFee).toBe("bigint");
        expect(blobBaseFee).toBeGreaterThan(BigInt(0));

        const code = await client.getCode({
          address: alice.getAddress()!,
        });

        expect(code).toBeUndefined();

        const feeHistory = await client.getFeeHistory({
          blockCount: 10,
          rewardPercentiles: [25, 75],
        });

        expect(feeHistory).toBeDefined();
        expect(feeHistory.reward).toBeDefined();
      });
    });

    describe("Wallet Client Operations", () => {
      it("should successfully handle wallet_addEthereumChain and wallet_switchEthereumChain", async () => {
        const client = createWalletClient({
          chain: hardhatAlt,
          transport: custom(hardhatProvider),
          account: alice.getAddress()!,
        });

        const chainId = await client.getChainId();
        expect(chainId).toBe(hardhatAlt.id);

        await client.addChain({
          chain: mainnet,
        });

        expect(await client.getChainId()).toBe(hardhatAlt.id);

        await client.switchChain({ id: mainnet.id });

        expect(await client.getChainId()).toBe(mainnet.id);
      });
    });

    describe("Signing Operations", () => {
      let aliceProvider: OkoEIP1193Provider;

      beforeAll(() => {
        aliceProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(hardhatAlt)], alice),
        );
      });

      it("should successfully perform personal_sign", async () => {
        const client = createWalletClient({
          chain: hardhatAlt,
          transport: custom(aliceProvider),
          account: alice.getAddress()!,
        });

        const message = "Hello, world!";
        const hash = hashMessage(message);

        const signature = await client.signMessage({
          account: alice.getAddress()!,
          message: message,
        });

        expect(signature).toBeDefined();
        expect(typeof signature).toBe("string");

        const recoveredAddress = await recoverAddress({
          hash,
          signature,
        });

        expect(isAddressEqual(recoveredAddress, alice.getAddress()!)).toBe(
          true,
        );
      });

      it("should reject eth_signTypedData_v4 with mismatched chain ID", async () => {
        const client = createWalletClient({
          chain: hardhatAlt,
          transport: custom(aliceProvider),
          account: alice.getAddress()!,
        });

        // Create typed data with different chain ID (mainnet = 1, hardhatAlt = 31337)
        const typedDataWithWrongChainId = createTypedData(BigInt(1));

        await expect(
          client.signTypedData({
            account: alice.getAddress()!,
            ...typedDataWithWrongChainId,
          }),
        ).rejects.toThrow(/does not match/);
      });

      it("should successfully perform eth_signTypedData_v4 with matching chain ID", async () => {
        const client = createWalletClient({
          chain: hardhatAlt,
          transport: custom(aliceProvider),
          account: alice.getAddress()!,
        });

        // Create typed data with matching chain ID (hardhatAlt = 31337)
        const typedDataWithMatchingChainId = createTypedData(BigInt(31337));

        const signature = await client.signTypedData({
          account: alice.getAddress()!,
          ...typedDataWithMatchingChainId,
        });

        expect(signature).toBeDefined();
        expect(typeof signature).toBe("string");
      });

      it("should successfully perform eth_signTransaction", async () => {
        const client = createWalletClient({
          chain: hardhatAlt,
          transport: custom(aliceProvider),
          account: alice.getAddress()!,
        });

        const request = await client.prepareTransactionRequest({
          to: bob.getAddress()!,
          value: parseEther("0.001"),
          gas: BigInt(21000),
          maxFeePerGas: BigInt(10000000),
          maxPriorityFeePerGas: BigInt(10000000),
          nonce: 0,
          data: "0x",
          type: "eip1559",
        });

        const signedTransaction = await client.signTransaction({
          ...request,
        });

        expect(signedTransaction).toBeDefined();
        expect(typeof signedTransaction).toBe("string");
        expect(signedTransaction).toMatch(/^0x02[a-fA-F0-9]+$/); // EIP-1559 transaction

        const recoveredAddress = await recoverTransactionAddress({
          serializedTransaction: signedTransaction as `0x02${string}`,
        });

        expect(isAddressEqual(recoveredAddress, alice.getAddress()!)).toBe(
          true,
        );
      });
    });

    describe("Transaction Operations", () => {
      let aliceProvider: OkoEIP1193Provider;
      let publicClient: any;
      let walletClient: any;
      let txHelper: any;

      beforeAll(() => {
        aliceProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(hardhatAlt)], alice),
        );

        publicClient = createPublicClient({
          chain: hardhatAlt,
          transport: custom(aliceProvider),
        });

        walletClient = createWalletClient({
          chain: hardhatAlt,
          transport: custom(aliceProvider),
          account: alice.getAddress()!,
        });

        txHelper = createTransactionHelper({
          publicClient,
          walletClient,
          account: alice.getAddress()!,
        });
      });

      it("should successfully perform eth_sendTransaction", async () => {
        const aliceBalance = await publicClient.getBalance({
          address: alice.getAddress()!,
        });

        const bobBalance = await publicClient.getBalance({
          address: bob.getAddress()!,
        });

        const oneEther = parseEther("1");

        const result = await txHelper.sendTransactionAndExpectSuccess({
          to: bob.getAddress()!,
          value: oneEther,
          gas: BigInt(21000), // intrinsic gas for a transfer
        });

        expect(result.hash).toBeDefined();
        expect(typeof result.hash).toBe("string");
        expect(result.hash).toMatch(/^0x[a-fA-F0-9]+$/);

        expect(result.receipt.status).toBe("success");
        expect(isAddressEqual(result.receipt.from, alice.getAddress()!)).toBe(
          true,
        );
        expect(isAddressEqual(result.receipt.to!, bob.getAddress()!)).toBe(
          true,
        );

        const aliceBalanceAfter = await publicClient.getBalance({
          address: alice.getAddress()!,
        });

        expect(aliceBalanceAfter).toBeLessThan(aliceBalance - oneEther); // 1 ether + gas fee deducted

        const bobBalanceAfter = await publicClient.getBalance({
          address: bob.getAddress()!,
        });

        expect(bobBalanceAfter).toEqual(bobBalance + oneEther);
      });

      it("should successfully send to random address", async () => {
        // Transaction to a random (potentially non-existent) address should still work
        // but let's test with a valid format
        const randomAddress = generateRandomAddress();

        const result = await txHelper.sendTransactionAndExpectSuccess({
          to: randomAddress,
          value: parseEther("0.001"),
        });

        expect(result.receipt.status).toBe("success");
        expect(isAddressEqual(result.receipt.to!, randomAddress)).toBe(true);
      });

      it("should successfully send zero value", async () => {
        // Zero value transaction should work
        const result = await txHelper.sendTransactionAndExpectSuccess({
          to: bob.getAddress()!,
          value: BigInt(0),
        });

        expect(result.receipt.status).toBe("success");
      });

      it("should fail with insufficient gas", async () => {
        // Transaction with very low gas should fail
        await txHelper.sendTransactionAndExpectFailure(
          {
            to: bob.getAddress()!,
            value: parseEther("0.1"),
            gas: BigInt(1000), // Way too low for a transfer
          },
          /gas|insufficient|intrinsic/i,
        );
      });

      it("should fail with excessive nonce", async () => {
        const currentNonce = await publicClient.getTransactionCount({
          address: alice.getAddress()!,
        });

        await txHelper.sendTransactionAndExpectFailure(
          {
            to: bob.getAddress()!,
            value: parseEther("0.001"),
            nonce: currentNonce + 100, // Way ahead
          },
          /nonce|too high/i,
        );
      });

      it("should fail with insufficient balance", async () => {
        const balance = await publicClient.getBalance({
          address: alice.getAddress()!,
        });

        // Try to send more than available balance
        await txHelper.sendTransactionAndExpectFailure(
          {
            to: bob.getAddress()!,
            value: balance + parseEther("1"), // More than available balance
          },
          /insufficient|balance|funds|method not supported|provider does not support/i,
        );
      });

      it("should fail with malformed data", async () => {
        // Send transaction with malformed/non-hex data
        await txHelper.sendTransactionAndExpectFailure(
          {
            to: bob.getAddress()!,
            data: "invalid-hex-data" as any, // Invalid data format
          },
          /invalid|hex|data/i,
        );
      });

      it("should fail with double spending attempt", async () => {
        const currentNonce = await publicClient.getTransactionCount({
          address: alice.getAddress()!,
        });

        // First transaction
        const tx1Promise = txHelper.sendTransactionAndExpectSuccess({
          to: bob.getAddress()!,
          value: parseEther("1"),
          nonce: currentNonce,
        });

        // Second transaction with same nonce (double spending attempt)
        const tx2Promise = txHelper.sendTransactionAndExpectFailure(
          {
            to: charlie.getAddress()!,
            value: parseEther("1"),
            nonce: currentNonce, // Same nonce as first transaction
          },
          /nonce|already|used|replacement/i,
        );

        // Wait for both
        await tx1Promise;
        await tx2Promise;
      });
    });

    describe("Contract Operations", () => {
      let aliceProvider: OkoEIP1193Provider;
      let publicClient: any;
      let walletClient: any;
      let contractHelper: any;

      beforeAll(() => {
        aliceProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(hardhatAlt)], alice),
        );

        publicClient = createPublicClient({
          chain: hardhatAlt,
          transport: custom(aliceProvider),
        });

        walletClient = createWalletClient({
          chain: hardhatAlt,
          transport: custom(aliceProvider),
          account: alice.getAddress()!,
        });

        contractHelper = createContractHelper({
          publicClient,
          walletClient,
          account: alice.getAddress()!,
        });
      });

      it("should successfully perform contract creation and calls", async () => {
        const deployResult = await contractHelper.deployContract({
          abi: COUNTER_ABI,
          bytecode: COUNTER_DEPLOYMENT_BYTECODE,
        });
        const counterAddress = deployResult.contractAddress;

        expect(counterAddress).toBeDefined();
        expect(typeof counterAddress).toBe("string");
        expect(counterAddress).toMatch(/^0x[a-fA-F0-9]+$/);

        const numberBefore = await publicClient.readContract({
          address: counterAddress,
          abi: COUNTER_ABI,
          functionName: "number",
        });

        expect(typeof numberBefore).toBe("bigint");
        expect(numberBefore).toBe(BigInt(0));

        // Call increment function
        const incrementResult =
          await contractHelper.sendTransactionAndExpectSuccess({
            to: counterAddress,
            data: encodeFunctionData({
              abi: COUNTER_ABI,
              functionName: "increment",
            }),
          });

        expect(incrementResult.receipt.status).toBe("success");
        expect(
          isAddressEqual(incrementResult.receipt.from, alice.getAddress()!),
        ).toBe(true);
        expect(
          isAddressEqual(incrementResult.receipt.to!, counterAddress),
        ).toBe(true);

        const numberAfter = await publicClient.readContract({
          address: counterAddress,
          abi: COUNTER_ABI,
          functionName: "number",
        });

        expect(numberAfter).toBe(numberBefore + BigInt(1));
      });

      it("should fail to deploy contract with invalid bytecode", async () => {
        // Deploy with invalid bytecode should fail
        await contractHelper.deployContractAndExpectFailure(
          {
            abi: COUNTER_ABI,
            bytecode: generateInvalidBytecode(),
          },
          /revert|invalid|execution failed|internal error/i,
          BigInt(300000),
        );
      });

      it("should fail to deploy contract with no data", async () => {
        await contractHelper.deployContractAndExpectFailure(
          undefined,
          /revert|invalid|execution failed|contract creation without.*data|method not supported|provider does not support/i,
          BigInt(300000),
        );
      });

      it("should fail with invalid function data", async () => {
        // Deploy a valid contract first
        const deployResult = await contractHelper.deployContract({
          abi: COUNTER_ABI,
          bytecode: COUNTER_DEPLOYMENT_BYTECODE,
        });
        const counterAddress = deployResult.contractAddress;

        // Call with invalid function selector
        await contractHelper.sendTransactionAndExpectFailure(
          {
            to: counterAddress,
            data: "0xdeadbeef", // Invalid function selector
          },
          /revert|function|selector|internal error/i,
        );
      });

      it("should fail contract call with insufficient gas", async () => {
        // Deploy contract first
        const deployResult = await contractHelper.deployContract({
          abi: COUNTER_ABI,
          bytecode: COUNTER_DEPLOYMENT_BYTECODE,
        });
        const counterAddress = deployResult.contractAddress;

        // Call function with insufficient gas
        await contractHelper.sendTransactionAndExpectFailure(
          {
            to: counterAddress,
            data: encodeFunctionData({
              abi: COUNTER_ABI,
              functionName: "increment",
            }),
            gas: BigInt(10000), // Too low for function execution
          },
          /gas|out of gas|execution|revert/i,
        );
      });
    });

    // NOTE: disabled for now, as hardhat does not support EIP-7702
    // describe("Advanced Features", () => {
    //   let aliceProvider: OkoEIP1193Provider;
    //   let publicClient: any;
    //   let walletClient: any;
    //   let txHelper: any;

    //   beforeAll(() => {
    //     aliceProvider = new OkoEIP1193Provider(
    //       createProviderOptions([createChainParam(hardhatAlt)], alice),
    //     );

    //     publicClient = createPublicClient({
    //       chain: hardhatAlt,
    //       transport: custom(aliceProvider),
    //     });

    //     walletClient = createWalletClient({
    //       chain: hardhatAlt,
    //       transport: custom(aliceProvider),
    //       account: alice.getAddress()!,
    //     });

    //     txHelper = createTransactionHelper({
    //       publicClient,
    //       walletClient,
    //       account: alice.getAddress()!,
    //     });
    //   });

    //   it("should successfully handle EIP-7702 as EIP-1559 transaction", async () => {
    //     const contractHelper = createContractHelper({
    //       publicClient,
    //       walletClient,
    //       account: alice.getAddress()!,
    //     });

    //     const deployResult = await contractHelper.deployContract({
    //       abi: COUNTER_ABI,
    //       bytecode: COUNTER_DEPLOYMENT_BYTECODE,
    //     });
    //     const counterAddress = deployResult.contractAddress;

    //     const nonce = await publicClient.getTransactionCount({
    //       address: alice.getAddress()!,
    //     });

    //     const authorization: Authorization = {
    //       address: counterAddress,
    //       chainId: hardhatAlt.id,
    //       nonce: nonce + 1,
    //     };

    //     const authorizationHash = hashAuthorization(authorization);

    //     const signature = parseSignature(
    //       (await (alice as any).signHash({
    //         hash: authorizationHash,
    //       })) as `0x${string}`,
    //     );

    //     authorization.r = signature.r;
    //     authorization.s = signature.s;
    //     authorization.v = signature.v;

    //     const intrinsicGas = 25000 + 21000; // 25000 for authorization, 21000 for transfer zero value

    //     const { receipt } = await txHelper.sendTransactionAndExpectSuccess({
    //       to: await alice.getAddress(),
    //       authorizationList: [authorization],
    //       gas: BigInt(intrinsicGas),
    //     });

    //     expect(receipt.status).toBe("success");
    //     expect(receipt.type).toBe("eip1559");
    //     expect(receipt.gasUsed).toBeLessThan(BigInt(intrinsicGas));
    //   });
    // });
  });
});
