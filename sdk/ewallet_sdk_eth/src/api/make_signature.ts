import type {
  ChainInfoForAttachedModal,
  EthereumTxSignResponse,
  EWalletMsgMakeSignature,
  EWalletMsgShowModal,
  MakeEthereumSigData,
} from "@keplr-ewallet/ewallet-sdk-core";
import { type Signature, serializeSignature, serializeTransaction } from "viem";
import { v4 as uuidv4 } from "uuid";

import type {
  EthSignMethod,
  SignFunctionParams,
  SignFunctionResult,
} from "@keplr-ewallet-sdk-eth/types";
import {
  hashEthereumMessage,
  hashEthereumTransaction,
  hashEthereumTypedData,
  encodeEthereumSignature,
  toTransactionSerializable,
  parseTypedDataDefinition,
} from "@keplr-ewallet-sdk-eth/utils";
import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";
import {
  getChainIconUrl,
  SUPPORTED_CHAINS,
} from "@keplr-ewallet-sdk-eth/chains";
import { standardError } from "@keplr-ewallet-sdk-eth/errors";

const signTypeConfig: Record<
  EthSignMethod,
  {
    sign_type: "tx" | "arbitrary" | "eip712";
    hashFunction: (data: MakeEthereumSigData) => Uint8Array;
    processResult: (
      signature: Signature,
      data?: MakeEthereumSigData,
    ) => SignFunctionResult<EthSignMethod>;
  }
> = {
  sign_transaction: {
    sign_type: "tx",
    hashFunction: (data: MakeEthereumSigData) => {
      if (data.chain_type !== "eth") {
        throw standardError.ethEWallet.invalidChainType({
          message: "Chain type should be eth",
        });
      }

      if (data.sign_type !== "tx") {
        throw standardError.ethEWallet.invalidSignType({
          message: "Sign type should be tx",
        });
      }

      const payload = data.payload;

      const serializableTx = toTransactionSerializable({
        chainId: payload.chain_info.chain_id,
        tx: payload.data.transaction,
      });
      return hashEthereumTransaction(serializableTx);
    },
    processResult: (signature: Signature, data?: MakeEthereumSigData) => {
      if (!data) {
        throw standardError.ethEWallet.invalidMessage({
          message: "Data is required for sign_transaction method",
        });
      }

      if (data.chain_type !== "eth") {
        throw standardError.ethEWallet.invalidChainType({
          message: "Chain type should be eth",
        });
      }

      if (data.sign_type !== "tx") {
        throw standardError.ethEWallet.invalidSignType({
          message: "Sign type should be tx",
        });
      }

      const payload = data.payload;

      const serializableTx = toTransactionSerializable({
        chainId: payload.chain_info.chain_id,
        tx: payload.data.transaction,
      });
      const signedTransaction = serializeTransaction(serializableTx, signature);

      return {
        type: "signed_transaction",
        signedTransaction,
      };
    },
  },
  personal_sign: {
    sign_type: "arbitrary",
    hashFunction: (data: MakeEthereumSigData) => {
      if (data.chain_type !== "eth") {
        throw standardError.ethEWallet.invalidChainType({
          message: "Chain type should be eth",
        });
      }

      if (data.sign_type !== "arbitrary") {
        throw standardError.ethEWallet.invalidSignType({
          message: "Sign type should be arbitrary",
        });
      }

      const payloadData = data.payload.data;

      return hashEthereumMessage(payloadData.message);
    },
    processResult: (signature: Signature) => ({
      type: "signature",
      signature: serializeSignature(signature),
    }),
  },
  sign_typedData_v4: {
    sign_type: "eip712",
    hashFunction: (data: MakeEthereumSigData) => {
      if (data.chain_type !== "eth") {
        throw standardError.ethEWallet.invalidChainType({
          message: "Chain type should be eth",
        });
      }

      if (data.sign_type !== "eip712") {
        throw standardError.ethEWallet.invalidSignType({
          message: "Sign type should be eip712",
        });
      }

      const payloadData = data.payload.data;

      if (payloadData.version !== "4") {
        throw standardError.ethEWallet.invalidMessage({
          message:
            "Typed data version should be 4 for sign_typedData_v4 method",
        });
      }

      const typedData = parseTypedDataDefinition(
        payloadData.serialized_typed_data,
      );

      return hashEthereumTypedData(typedData);
    },
    processResult: (signature: Signature) => ({
      type: "signature",
      signature: serializeSignature(signature),
    }),
  },
};

async function handleSigningFlow<M extends EthSignMethod>(
  ethEWallet: EthEWallet,
  config: (typeof signTypeConfig)[M],
  data: MakeEthereumSigData,
): Promise<SignFunctionResult<M>> {
  const showModalMsg: EWalletMsgShowModal = {
    target: "keplr_ewallet_attached",
    msg_type: "show_modal",
    payload: {
      modal_type: "make_signature",
      data,
    },
  };

  const eWallet = ethEWallet.eWallet;

  const modalResponse = await eWallet.showModal(showModalMsg);

  await eWallet.hideModal();

  if (modalResponse === "reject") {
    throw standardError.ethEWallet.userRejectedRequest({
      message: "User rejected the signature request",
    });
  }

  if (modalResponse !== "approve") {
    const makeSignatureResponse = modalResponse.data as EthereumTxSignResponse;

    if (data.sign_type === "tx") {
      const transaction = makeSignatureResponse.transaction;
      if (!transaction) {
        throw standardError.ethEWallet.invalidMessage({
          message:
            "Simulation result is not present for sign_transaction method",
        });
      }

      // override the transaction with the simulation result
      data.payload.data.transaction = transaction;
    }
  }

  const msgHash = config.hashFunction(data);

  const makeSignatureMsg: EWalletMsgMakeSignature = {
    target: "keplr_ewallet_attached",
    msg_type: "make_signature",
    payload: {
      msg: msgHash,
    },
  };

  const makeSignatureResponse = await eWallet.makeSignature(makeSignatureMsg);
  if (!makeSignatureResponse) {
    throw standardError.ethEWallet.signatureFailed({});
  }

  const signature = encodeEthereumSignature(makeSignatureResponse.sign_output);
  return config.processResult(signature, data);
}

export async function makeSignature<M extends EthSignMethod>(
  this: EthEWallet,
  parameters: SignFunctionParams<M>,
): Promise<SignFunctionResult<M>> {
  const origin = this.eWallet.origin;

  const provider = await this.getEthereumProvider();
  const chainId = provider.chainId;
  const chainIdNumber = parseInt(chainId, 16);

  // CHECK: custom chains added to the provider can be used later
  const activeChain = SUPPORTED_CHAINS.find(
    (chain) => chain.id === chainIdNumber,
  );
  if (!activeChain) {
    throw standardError.ethEWallet.invalidMessage({
      message: "Chain not found in the supported chains",
    });
  }

  const chainInfo: ChainInfoForAttachedModal = {
    chain_id: `eip155:${activeChain.id}`,
    chain_name: activeChain.name,
    chain_symbol_image_url: getChainIconUrl(activeChain.id),
    rpc_url: activeChain.rpcUrls.default.http[0],
    block_explorer_url: activeChain.blockExplorers?.default.url,
  };

  const requestId = uuidv4();

  switch (parameters.type) {
    case "sign_transaction": {
      const makeSignatureData: MakeEthereumSigData = {
        chain_type: "eth",
        sign_type: "tx",
        payload: {
          chain_info: chainInfo,
          origin,
          signer: parameters.data.address,
          request_id: requestId,
          data: {
            transaction: parameters.data.transaction,
          },
        },
      };

      return handleSigningFlow(
        this,
        signTypeConfig.sign_transaction,
        makeSignatureData,
      );
    }

    case "personal_sign": {
      const makeSignatureData: MakeEthereumSigData = {
        chain_type: "eth",
        sign_type: "arbitrary",
        payload: {
          chain_info: chainInfo,
          origin,
          signer: parameters.data.address,
          request_id: requestId,
          data: {
            message: parameters.data.message,
          },
        },
      };

      return handleSigningFlow(
        this,
        signTypeConfig.personal_sign,
        makeSignatureData,
      );
    }

    case "sign_typedData_v4": {
      const makeSignatureData: MakeEthereumSigData = {
        chain_type: "eth",
        sign_type: "eip712",
        payload: {
          chain_info: chainInfo,
          origin,
          signer: parameters.data.address,
          request_id: requestId,
          data: {
            version: "4",
            serialized_typed_data: parameters.data.serializedTypedData,
          },
        },
      };

      return handleSigningFlow(
        this,
        signTypeConfig.sign_typedData_v4,
        makeSignatureData,
      );
    }

    default: {
      throw standardError.ethEWallet.invalidMessage({
        message: `Unknown sign method: ${(parameters as any).type}`,
      });
    }
  }
}
