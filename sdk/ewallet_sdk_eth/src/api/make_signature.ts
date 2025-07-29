import type {
  EWalletMsgMakeSignature,
  EWalletMsgShowModal,
  MakeEthereumSigData,
} from "@keplr-ewallet/ewallet-sdk-core";
import { type Signature, serializeSignature, serializeTransaction } from "viem";

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
} from "@keplr-ewallet-sdk-eth/utils";
import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

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
        throw new Error("Invalid chain type");
      }

      if (data.sign_type !== "tx") {
        throw new Error("Invalid sign type");
      }

      const payload = data.payload;

      const serializableTx = toTransactionSerializable({
        chainId: payload.chain_info.chain_id,
        tx: payload.data,
      });
      return hashEthereumTransaction(serializableTx);
    },
    processResult: (signature: Signature, data?: MakeEthereumSigData) => {
      if (!data) {
        throw new Error("Data is required");
      }

      if (data.chain_type !== "eth") {
        throw new Error("Invalid chain type");
      }

      if (data.sign_type !== "tx") {
        throw new Error("Invalid sign type");
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
        throw new Error("Invalid chain type");
      }

      if (data.sign_type !== "arbitrary") {
        throw new Error("Invalid sign type");
      }

      const payload = data.payload;

      return hashEthereumMessage(payload.data);
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
        throw new Error("Invalid chain type");
      }

      if (data.sign_type !== "eip712") {
        throw new Error("Invalid sign type");
      }

      const payload = data.payload;

      return hashEthereumTypedData(payload.data);
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
    msg_type: "show_modal",
    payload: {
      modal_type: "make_signature",
      data,
    },
  };

  const eWallet = ethEWallet.eWallet;

  const openModalAck = await eWallet.showModal(showModalMsg);

  if (openModalAck.msg_type !== "show_modal_ack") {
    throw new Error("Unreachable");
  }

  await eWallet.hideModal();

  if (openModalAck.payload === "reject") {
    throw new Error("User rejected the signature request");
  }

  const msgHash = config.hashFunction(data);

  const makeSignatureMsg: EWalletMsgMakeSignature = {
    msg_type: "make_signature",
    payload: {
      msg: msgHash,
    },
  };

  const makeSignatureAck = await eWallet.sendMsgToIframe(makeSignatureMsg);

  if (makeSignatureAck.msg_type !== "make_signature_ack") {
    throw new Error("Unreachable");
  }

  const signature = encodeEthereumSignature(
    makeSignatureAck.payload.sign_output,
  );
  return config.processResult(signature, data);
}

export async function makeSignature<M extends EthSignMethod>(
  this: EthEWallet,
  parameters: SignFunctionParams<M>,
): Promise<SignFunctionResult<M>> {
  const origin = this.eWallet.origin;
  const activeChain = this.activeChain;
  if (!activeChain) {
    throw new Error("Active chain not found");
  }

  const chainInfo = {
    chain_id: `eip155:${activeChain.id}`,
    chain_name: activeChain.name,
    chain_symbol_image_url: `https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/eip155:${activeChain.id}/chain.png`,
    // CHECK: to check if the chain is op stack or elastic chain?
    // because L1 publish fee estimation might be required for those chains
  };

  switch (parameters.type) {
    case "sign_transaction": {
      const makeSignatureData: MakeEthereumSigData = {
        chain_type: "eth",
        sign_type: "tx",
        payload: {
          chain_info: chainInfo,
          origin,
          signer: parameters.data.address,
          data: parameters.data.transaction,
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
          data: parameters.data.message,
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
          data: parameters.data.message,
        },
      };

      return handleSigningFlow(
        this,
        signTypeConfig.sign_typedData_v4,
        makeSignatureData,
      );
    }

    default: {
      throw new Error(`Unknown sign method: ${(parameters as any).type}`);
    }
  }
}
