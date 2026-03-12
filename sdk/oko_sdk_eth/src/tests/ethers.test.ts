import type { Signer, TransactionRequest } from "ethers";
import {
  BrowserProvider,
  Contract,
  ContractFactory,
  hashMessage,
  isAddress,
  parseEther,
  parseUnits,
  recoverAddress,
  Transaction,
  TypedDataEncoder,
} from "ethers";
import { isAddressEqual } from "viem";
import { mainnet } from "viem/chains";

import { hardhat, hardhatAccounts, hardhatNode } from "./hardhat";
import {
  COUNTER_ABI,
  COUNTER_DEPLOYMENT_BYTECODE,
  createChainParam,
  createDummySigner,
  createEthSigner,
  createProviderOptions,
  DUMMY_ADDRESS,
  generateInvalidBytecode,
  generateRandomAddress,
} from "./utils";
import {
  createEthersContractHelper,
  createEthersTransactionHelper,
} from "./utils/ethersHelpers";
import { OkoEIP1193Provider } from "@oko-wallet-sdk-eth/provider";
import type { OkoEthSigner } from "@oko-wallet-sdk-eth/types";

describe("Oko Provider - Ethers.js Integration", () => {
  describe("BrowserProvider - Live RPC", () => {
    let provider: OkoEIP1193Provider;

    beforeAll(async () => {
      const mainnetChainParam = createChainParam(mainnet);
      provider = new OkoEIP1193Provider(
        createProviderOptions([mainnetChainParam], createDummySigner()),
      );
    });

    it("should successfully work with ethers.js BrowserProvider", async () => {
      const ethersProvider = new BrowserProvider(provider);

      const blockNumber = await ethersProvider.getBlockNumber();

      expect(blockNumber).toBeDefined();
      expect(typeof blockNumber).toBe("number");

      const signer = await ethersProvider.getSigner();
      expect(signer).toBeDefined();

      const address = await signer.getAddress();
      expect(typeof address).toBe("string");
      expect(address).toBe(DUMMY_ADDRESS);
      expect(isAddress(address)).toBe(true);
    });
  });

  describe("Hardhat Integration", () => {
    let hardhatProvider: OkoEIP1193Provider;
    let delta: OkoEthSigner;
    let epsilon: OkoEthSigner;
    let _foxtrot: OkoEthSigner;

    beforeAll(async () => {
      // Use accounts 3, 4, 5 for ethers.test.ts to avoid conflicts with viem.test.ts
      delta = createEthSigner(hardhat.id, hardhatAccounts[3].privateKey);
      epsilon = createEthSigner(hardhat.id, hardhatAccounts[4].privateKey);
      _foxtrot = createEthSigner(hardhat.id, hardhatAccounts[5].privateKey);

      try {
        await hardhatNode.start();
        const hardhatChainParam = createChainParam(hardhat);
        hardhatProvider = new OkoEIP1193Provider(
          createProviderOptions([hardhatChainParam]),
        );
      } catch (error) {
        console.warn("⚠️  Failed to start Hardhat node:", error);
        throw error;
      }
    }, 30000);

    afterAll(async () => {
      try {
        await hardhatNode.stop();
        // Additional safety: force cleanup if needed
        await hardhatNode.forceCleanup();
      } catch (error) {
        console.warn("⚠️  Error during Hardhat node cleanup:", error);
        await hardhatNode.forceCleanup();
      }
    }, 10000);

    describe("BrowserProvider Operations", () => {
      it("should successfully perform public RPC operations", async () => {
        const ethersProvider = new BrowserProvider(hardhatProvider);

        const blockNumber = await ethersProvider.getBlockNumber();
        expect(blockNumber).toBeDefined();
        expect(typeof blockNumber).toBe("number");
        expect(blockNumber).toBeGreaterThanOrEqual(0);

        const balance = await ethersProvider.getBalance(delta.getAddress()!);

        expect(balance).toBeDefined();
        expect(typeof balance).toBe("bigint");
        expect(balance).toBeGreaterThan(BigInt(0));

        const block = await ethersProvider.getBlock(blockNumber);

        expect(block).toBeDefined();
        expect(block!.number).toBe(blockNumber);
        expect(block!.hash).toBeDefined();

        const feeData = await ethersProvider.getFeeData();
        expect(feeData).toBeDefined();
        expect(typeof feeData.gasPrice).toBe("bigint");
        expect(feeData.gasPrice).toBeGreaterThan(BigInt(0));

        const code = await ethersProvider.getCode(delta.getAddress()!);

        expect(code).toBe("0x");
      });
    });

    describe("Signer Operations", () => {
      let deltaProvider: OkoEIP1193Provider;

      beforeAll(async () => {
        deltaProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(hardhat)], delta),
        );
      });

      it("should successfully perform personal_sign", async () => {
        const ethersProvider = new BrowserProvider(deltaProvider);
        const signer = await ethersProvider.getSigner();

        const message = "Hello, world!";
        const signature = await signer.signMessage(message);

        expect(signature).toBeDefined();
        expect(typeof signature).toBe("string");

        const recoveredAddress = recoverAddress(
          hashMessage(message),
          signature,
        );

        expect(
          isAddressEqual(
            recoveredAddress as `0x${string}`,
            delta.getAddress()!,
          ),
        ).toBe(true);
      });

      it("should successfully perform eth_signTypedData_v4", async () => {
        const ethersProvider = new BrowserProvider(deltaProvider);
        const signer = await ethersProvider.getSigner();

        const domain = {
          name: "Ether Mail",
          version: "1",
          chainId: BigInt(hardhat.id), // Chain ID should match the hardhat chain ID
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
        };

        const types = {
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
          ],
        };

        const message = {
          from: {
            name: "Canon",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          to: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          },
          contents: "Hello, Bob!",
        };

        const signature = await signer.signTypedData(domain, types, message);

        expect(signature).toBeDefined();
        expect(typeof signature).toBe("string");

        const hash = TypedDataEncoder.hash(domain, types, message);

        const recoveredAddress = recoverAddress(hash, signature);

        expect(
          isAddressEqual(
            recoveredAddress as `0x${string}`,
            delta.getAddress()!,
          ),
        ).toBe(true);
      });

      it("should successfully perform eth_signTransaction", async () => {
        const ethersProvider = new BrowserProvider(deltaProvider);
        const signer = await ethersProvider.getSigner();

        const request: TransactionRequest = {
          to: epsilon.getAddress()!,
          value: parseEther("0.001"),
          gasLimit: BigInt(21000),
          maxFeePerGas: parseUnits("10000", "gwei"),
          maxPriorityFeePerGas: parseUnits("10000", "gwei"),
          nonce: 0,
          data: "0x",
          type: 2,
        };

        const signedSerialized = await signer.signTransaction(request);

        expect(signedSerialized).toBeDefined();
        expect(typeof signedSerialized).toBe("string");
        expect(signedSerialized).toMatch(/^0x02[a-fA-F0-9]+$/); // EIP-1559 transaction

        const signedTransaction = Transaction.from(signedSerialized);

        expect(signedTransaction.to).toBe(epsilon.getAddress()!);
        expect(signedTransaction.value).toBe(parseEther("0.001"));
        expect(signedTransaction.gasLimit).toBe(BigInt(21000));
        expect(signedTransaction.maxFeePerGas).toBe(
          parseUnits("10000", "gwei"),
        );
        expect(signedTransaction.maxPriorityFeePerGas).toBe(
          parseUnits("10000", "gwei"),
        );

        const signature = signedTransaction.signature;

        expect(signature).toBeDefined();
        expect(typeof signature).toBe("object");
        expect(signature?.r).toBeDefined();
        expect(signature?.s).toBeDefined();
        expect(signature?.v).toBeDefined();

        const recoveredAddress = recoverAddress(
          signedTransaction.unsignedHash,
          signature!,
        );

        expect(
          isAddressEqual(
            recoveredAddress as `0x${string}`,
            delta.getAddress()!,
          ),
        ).toBe(true);
      });
    });

    describe("Transaction Operations", () => {
      let deltaProvider: OkoEIP1193Provider;
      let browserProvider: BrowserProvider;
      let signer: Signer;
      let txHelper: ReturnType<typeof createEthersTransactionHelper>;

      beforeAll(async () => {
        deltaProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(hardhat)], delta),
        );

        browserProvider = new BrowserProvider(deltaProvider, undefined, {
          cacheTimeout: 0, // default is 250ms, it's too long for the test
        });

        signer = await browserProvider.getSigner();
        txHelper = createEthersTransactionHelper({
          provider: browserProvider,
          signer,
        });
      });

      it("should successfully perform eth_sendTransaction", async () => {
        const deltaBalance = await browserProvider.getBalance(
          delta.getAddress()!,
        );
        const epsilonBalance = await browserProvider.getBalance(
          epsilon.getAddress()!,
        );
        expect(deltaBalance).toBeGreaterThan(BigInt(0));
        expect(epsilonBalance).toBeGreaterThan(BigInt(0));
        const oneEther = parseEther("1");
        await txHelper.sendTransactionAndExpectSuccess({
          to: epsilon.getAddress()!,
          value: oneEther,
        });
        const deltaBalanceAfter = await browserProvider.getBalance(
          delta.getAddress()!,
        );
        const epsilonBalanceAfter = await browserProvider.getBalance(
          epsilon.getAddress()!,
        );
        expect(deltaBalanceAfter).toBeLessThan(deltaBalance - oneEther);
        expect(epsilonBalanceAfter).toEqual(epsilonBalance + oneEther);
      });

      it("should successfully send to random address", async () => {
        const randomAddress = generateRandomAddress();
        const oneEther = parseEther("1");
        await txHelper.sendTransactionAndExpectSuccess({
          to: randomAddress,
          value: oneEther,
        });
      });

      it("should fail with insufficient gas", async () => {
        const oneEther = parseEther("1");
        await txHelper.sendTransactionAndExpectFailure(
          {
            to: epsilon.getAddress()!,
            value: oneEther,
            gasLimit: 1_000,
          },
          /requires at least 21000 gas/,
        );
      });

      it("should fail with excessive nonce", async () => {
        const oneEther = parseEther("1");
        const currentNonce = await signer.getNonce();
        await txHelper.sendTransactionAndExpectFailure(
          {
            to: epsilon.getAddress()!,
            value: oneEther,
            nonce: currentNonce + 100,
            gasLimit: 1_000,
          },
          /nonce|too high/i,
        );
      });

      it("should fail with insufficient balance", async () => {
        const oneEther = parseEther("1");
        const deltaBalance = await browserProvider.getBalance(
          delta.getAddress()!,
        );
        const currentNonce = await signer.getNonce();
        await txHelper.sendTransactionAndExpectFailure(
          {
            to: await epsilon.getAddress(),
            value: deltaBalance + oneEther,
            nonce: currentNonce,
            gasLimit: 22_000,
          },
          /insufficient|balance|funds|method not supported|provider does not support/i,
        );
      });

      it("should fail with malformed data", async () => {
        const oneEther = parseEther("1");
        await txHelper.sendTransactionAndExpectFailure(
          {
            to: await epsilon.getAddress(),
            value: oneEther,
            data: "invalid-hex-data" as any,
          },
          /invalid|hex|data/i,
        );
      });
    });

    describe("Contract Operations", () => {
      let deltaProvider: OkoEIP1193Provider;
      let browserProvider: BrowserProvider;
      let signer: Signer;
      let contractHelper: ReturnType<typeof createEthersContractHelper>;

      beforeAll(async () => {
        deltaProvider = new OkoEIP1193Provider(
          createProviderOptions([createChainParam(hardhat)], delta),
        );

        browserProvider = new BrowserProvider(deltaProvider, undefined, {
          cacheTimeout: 0, // default is 250ms, it's too long for the test
        });

        signer = await browserProvider.getSigner();
        contractHelper = createEthersContractHelper({
          provider: browserProvider,
          signer,
          contractFactory: ContractFactory,
          contractAbi: COUNTER_ABI,
          contractBytecode: COUNTER_DEPLOYMENT_BYTECODE,
        });
      });

      it("should successfully perform contract creation and calls", async () => {
        const { address: counterAddress } =
          await contractHelper.deployContract();
        expect(counterAddress).toBeDefined();
        expect(typeof counterAddress).toBe("string");
        expect(counterAddress).toMatch(/^0x[a-fA-F0-9]+$/);
        const counterContract = new Contract(counterAddress, COUNTER_ABI, {
          ...signer,
          sendTransaction: async (tx) => {
            const nonce = await browserProvider.getTransactionCount(
              await signer.getAddress(),
              "pending",
            );
            const feeData = await browserProvider.getFeeData();
            return signer.sendTransaction({
              ...tx,
              nonce,
              maxFeePerGas: feeData.maxFeePerGas,
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            });
          },
        });
        const numberBefore = await counterContract.number();
        expect(numberBefore).toBe(BigInt(0));
        const incrementResult = await counterContract.increment();
        expect(incrementResult).toBeDefined();
        const numberAfter = await counterContract.number();
        expect(numberAfter).toBe(BigInt(1));
      });

      it("should fail to deploy contract with invalid bytecode", async () => {
        await contractHelper.deployContractAndExpectFailure(
          generateInvalidBytecode(),
        );
      });

      it("should fail to deploy contract with no data", async () => {
        await contractHelper.deployContractAndExpectFailure("0x");
      });

      it("should fail contract call with insufficient gas", async () => {
        const { address: counterAddress } =
          await contractHelper.deployContract();
        const counterContract = new Contract(
          counterAddress,
          COUNTER_ABI,
          signer,
        );
        await expect(
          counterContract.increment({
            gasLimit: 21_00,
            gasPrice: parseUnits("10000", "gwei"),
          }),
        ).rejects.toThrow(/Transaction requires at least \d+ gas but got \d+/);
      });
    });
  });
});
