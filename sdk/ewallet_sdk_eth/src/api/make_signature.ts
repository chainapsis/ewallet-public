import type {
  EWalletMsgMakeSignature,
  EWalletMsgShowModal,
} from "@keplr-ewallet/ewallet-sdk-core";
import type { Signature, TransactionSerializable } from "viem";
import { serializeSignature, serializeTransaction } from "viem";

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
} from "@keplr-ewallet-sdk-eth/utils";
import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

const signTypeConfig: Record<
  EthSignMethod,
  {
    sign_type: "tx" | "arbitrary" | "eip712";
    hashFunction: (data: any) => Uint8Array;
    processResult: (
      signature: Signature,
      data?: any,
    ) => SignFunctionResult<EthSignMethod>;
  }
> = {
  sign_transaction: {
    sign_type: "tx",
    hashFunction: hashEthereumTransaction,
    processResult: (
      signature: Signature,
      transaction: TransactionSerializable,
    ) => {
      const signedTransaction = serializeTransaction(transaction, signature);
      return {
        type: "signed_transaction",
        signedTransaction,
      };
    },
  },
  personal_sign: {
    sign_type: "arbitrary",
    hashFunction: hashEthereumMessage,
    processResult: (signature: Signature) => ({
      type: "signature",
      signature: serializeSignature(signature),
    }),
  },
  sign_typedData_v4: {
    sign_type: "eip712",
    hashFunction: hashEthereumTypedData,
    processResult: (signature: Signature) => ({
      type: "signature",
      signature: serializeSignature(signature),
    }),
  },
};

async function handleSigningFlow<M extends EthSignMethod>(
  ethEWallet: EthEWallet,
  config: (typeof signTypeConfig)[M],
  signer: string,
  data: any,
  origin: string,
): Promise<SignFunctionResult<M>> {
  const activeChain = ethEWallet.activeChain;
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

  const showModalMsg: EWalletMsgShowModal = {
    msg_type: "show_modal",
    payload: {
      modal_type: "make_signature",
      data: {
        chain_type: "eth",
        sign_type: config.sign_type,
        payload: {
          chain_info: chainInfo,
          signer,
          data,
          origin,
        },
      },
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

  switch (parameters.type) {
    case "sign_transaction": {
      // TODO: simulate the tx and get the estimated fee
      // TODO: receive the simulated tx from the attached side (this is not required for the MVP)
      // we cannot estimate the fee here and just pass it to the attached side

      return handleSigningFlow(
        this,
        signTypeConfig.sign_transaction,
        parameters.data.address,
        parameters.data.transaction,
        origin,
      );
    }

    case "personal_sign": {
      return handleSigningFlow(
        this,
        signTypeConfig.personal_sign,
        parameters.data.address,
        parameters.data.message,
        origin,
      );
    }

    case "sign_typedData_v4": {
      return handleSigningFlow(
        this,
        signTypeConfig.sign_typedData_v4,
        parameters.data.address,
        parameters.data.message,
        origin,
      );
    }

    default: {
      throw new Error(`Unknown sign method: ${(parameters as any).type}`);
    }
  }
}
