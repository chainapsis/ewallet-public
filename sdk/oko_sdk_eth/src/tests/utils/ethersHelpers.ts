import type { Signer, TransactionRequest } from "ethers";
import { type BrowserProvider, Contract, type ContractFactory } from "ethers";

export interface EthersTransactionHelperOptions {
  provider: BrowserProvider;
  signer: Signer;
}

export interface EthersSendTransactionOptions extends TransactionRequest {}

export function createEthersTransactionHelper(
  options: EthersTransactionHelperOptions,
) {
  const { provider, signer } = options;

  async function prepareTransactionWithDefaults(
    txOptions: EthersSendTransactionOptions,
  ) {
    // Estimate gas if not provided
    let gasLimit = txOptions.gasLimit;
    if (!gasLimit) {
      gasLimit = await provider.estimateGas(txOptions);
    }
    // Get fee data if not provided
    let maxFeePerGas = txOptions.maxFeePerGas;
    let maxPriorityFeePerGas = txOptions.maxPriorityFeePerGas;
    if (!maxFeePerGas || !maxPriorityFeePerGas) {
      const feeData = await provider.getFeeData();
      maxFeePerGas = maxFeePerGas ?? feeData.maxFeePerGas;
      maxPriorityFeePerGas =
        maxPriorityFeePerGas ?? feeData.maxPriorityFeePerGas;
    }
    return {
      ...txOptions,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  }

  async function sendTransaction(txOptions: EthersSendTransactionOptions) {
    const request = await prepareTransactionWithDefaults(txOptions);
    // Always fetch the latest nonce if not provided
    let nonce = request.nonce;
    if (nonce === undefined) {
      nonce = await provider.getTransactionCount(
        await signer.getAddress(),
        "pending",
      );
    }
    const txRequest = { ...request, nonce };
    const txResponse = await signer.sendTransaction(txRequest);
    const receipt = await txResponse.wait();
    if (!receipt) {
      throw new Error("Transaction did not return a receipt");
    }
    return receipt;
  }

  async function sendTransactionAndExpectSuccess(
    txOptions: EthersSendTransactionOptions,
  ) {
    const receipt = await sendTransaction(txOptions);
    expect(receipt.status).toBe(1);
    return receipt;
  }

  async function sendTransactionAndExpectFailure(
    txOptions: EthersSendTransactionOptions,
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

export interface EthersContractHelperOptions
  extends EthersTransactionHelperOptions {
  contractFactory: typeof ContractFactory;
  contractAbi: any;
  contractBytecode: string;
}

export function createEthersContractHelper(
  options: EthersContractHelperOptions,
) {
  const txHelper = createEthersTransactionHelper(options);
  const { signer, provider, contractAbi, contractBytecode } = options;

  async function deployContract(
    bytecodeOverride?: string,
    // ...factoryArgs: any[]
  ) {
    const bytecode = bytecodeOverride ?? contractBytecode;
    const address = await signer.getAddress();
    const nonce = await provider.getTransactionCount(address, "pending");
    const gasLimit = await provider.estimateGas({ data: bytecode });
    const feeData = await provider.getFeeData();
    const tx = await signer.sendTransaction({
      data: bytecode,
      nonce,
      gasLimit,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    });
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Contract deployment did not return a receipt");
    }
    const contractAddress = receipt.contractAddress;
    if (!contractAddress) {
      throw new Error("Contract deployment did not return a contract address");
    }
    expect(contractAddress).toBeDefined();
    return {
      contract: new Contract(contractAddress, contractAbi, signer),
      address: contractAddress,
    };
  }

  async function deployContractAndExpectFailure(
    bytecodeOverride?: string,
    // ...factoryArgs: any[]
  ) {
    try {
      await deployContract(bytecodeOverride);
      throw new Error("Contract deployment was expected to fail but succeeded");
    } catch (error: any) {
      return error;
    }
  }

  return {
    ...txHelper,
    deployContract,
    deployContractAndExpectFailure,
  };
}
