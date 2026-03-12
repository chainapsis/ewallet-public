import type {
  Account,
  Authorization,
  EncodeDeployDataParameters,
  Hex,
  PublicClient,
  TypedDataDefinition,
  WalletClient,
} from "viem";
import { encodeDeployData } from "viem";

export const createTypedData = (chainId?: bigint): TypedDataDefinition => {
  const domain = {
    name: "Ether Mail",
    version: "1",
    chainId: chainId ?? BigInt(1),
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  } as const;

  const types = {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Person: [
      { name: "name", type: "string" },
      { name: "wallet", type: "address" },
    ],
    Mail: [
      { name: "from", type: "Person" },
      { name: "to", type: "Person" },
      { name: "contents", type: "string" },
    ],
  } as const;
  const primaryType = "Mail";
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
  } as const;
  const typedData = {
    domain,
    types,
    primaryType,
    message,
  } as const;

  return typedData;
};

// Transaction Helper Functions
export interface TransactionHelperOptions {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Account | `0x${string}`;
}

export interface SendTransactionOptions {
  to?: `0x${string}`;
  value?: bigint;
  data?: Hex;
  gas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  authorizationList?: Authorization[];
}

export function createTransactionHelper(options: TransactionHelperOptions) {
  const { publicClient, walletClient, account } = options;

  async function prepareTransactionWithDefaults(
    txOptions: SendTransactionOptions,
  ) {
    const {
      maxFeePerGas: estimatedMaxFeePerGas,
      maxPriorityFeePerGas: estimatedMaxPriorityFeePerGas,
    } = await publicClient.estimateFeesPerGas();

    const nonce =
      txOptions.nonce ??
      (await publicClient.getTransactionCount({
        address: typeof account === "string" ? account : account.address,
      }));

    const baseRequest = {
      ...txOptions,
      nonce,
      maxFeePerGas: txOptions.maxFeePerGas ?? estimatedMaxFeePerGas * BigInt(2),
      maxPriorityFeePerGas:
        txOptions.maxPriorityFeePerGas ??
        estimatedMaxPriorityFeePerGas * BigInt(2),
      authorizationList: txOptions.authorizationList,
    } as any;

    return walletClient.prepareTransactionRequest(baseRequest);
  }

  async function sendTransaction(txOptions: SendTransactionOptions) {
    const request = await prepareTransactionWithDefaults(txOptions);

    // Estimate gas if not provided
    const gasEstimate =
      txOptions.gas ??
      (await publicClient.estimateGas({
        ...request,
      }));

    const txHash = await walletClient.sendTransaction({
      ...request,
      gas: gasEstimate,
      account,
    } as any);

    return {
      hash: txHash,
      receipt: await publicClient.waitForTransactionReceipt({ hash: txHash }),
    };
  }

  async function sendTransactionAndExpectSuccess(
    txOptions: SendTransactionOptions,
  ) {
    const result = await sendTransaction(txOptions);
    expect(result.receipt.status).toBe("success");
    return result;
  }

  async function sendTransactionAndExpectFailure(
    txOptions: SendTransactionOptions,
    expectedError?: string | RegExp,
  ) {
    try {
      await sendTransaction(txOptions);
      throw new Error("Transaction was expected to fail but succeeded");
    } catch (error: any) {
      if (expectedError) {
        if (typeof expectedError === "string") {
          expect(error.message).toContain(expectedError);
        } else {
          expect(error.message).toMatch(expectedError);
        }
      }
      return error;
    }
  }

  return {
    prepareTransactionWithDefaults,
    sendTransaction,
    sendTransactionAndExpectSuccess,
    sendTransactionAndExpectFailure,
  };
}

// Contract Helper Functions
export function createContractHelper(options: TransactionHelperOptions) {
  const txHelper = createTransactionHelper(options);

  async function deployContract(params: EncodeDeployDataParameters) {
    const data = encodeDeployData(params);

    const result = await txHelper.sendTransactionAndExpectSuccess({
      data,
    });

    expect(result.receipt.to).toBeNull(); // Contract deployment should not have a to address
    expect(result.receipt.contractAddress).toBeDefined();

    return {
      ...result,
      contractAddress: result.receipt.contractAddress!,
    };
  }

  async function deployContractAndExpectFailure(
    params?: EncodeDeployDataParameters,
    expectedError?: string | RegExp,
    gasOverride?: bigint,
  ) {
    const data = params ? encodeDeployData(params) : "0x";

    return txHelper.sendTransactionAndExpectFailure(
      {
        data,
        gas: gasOverride,
      },
      expectedError,
    );
  }

  return {
    ...txHelper,
    deployContract,
    deployContractAndExpectFailure,
  };
}
