import type {
  ChainInfoForAttachedModal,
  MakeEthereumSigData,
  OkoWalletMsgOpenModal,
} from "@oko-wallet/oko-sdk-core";
import { v4 as uuidv4 } from "uuid";

import {
  EthereumRpcError,
  ProviderRpcErrorCode,
  RpcErrorCode,
} from "@oko-wallet-sdk-eth/provider";
import type {
  EthSignParams,
  EthSignResult,
  MakeSignatureBasePayload,
  OkoEthWalletInterface,
} from "@oko-wallet-sdk-eth/types";
import { toSignableTransaction } from "@oko-wallet-sdk-eth/utils";

export async function makeSignature(
  this: OkoEthWalletInterface,
  params: EthSignParams,
): Promise<EthSignResult> {
  await this.waitUntilInitialized;

  const origin = this.okoWallet.origin;

  const provider = await this.getEthereumProvider();

  const activeChain = provider.activeChain;
  const chainIdNumber = parseInt(activeChain.chainId, 16);

  const chainInfo: ChainInfoForAttachedModal = {
    chain_id: `eip155:${chainIdNumber}`,
    chain_name: activeChain.chainName,
    chain_symbol_image_url: activeChain.chainSymbolImageUrl,
    rpc_url: activeChain.rpcUrls[0],
    block_explorer_url: activeChain.blockExplorerUrls?.[0],
    currencies: activeChain.currencies,
    bip44: activeChain.bip44,
    features: activeChain.features,
    evm: activeChain.evm,
  };

  const basePayload = {
    chain_info: chainInfo,
    origin,
    signer: params.data.address,
  };

  const makeSignatureData = createMakeSignatureData(basePayload, params);

  const signResult = await handleSigningFlow(this, makeSignatureData);

  return signResult;
}

function createMakeSignatureData(
  basePayload: MakeSignatureBasePayload,
  params: EthSignParams,
): MakeEthereumSigData {
  switch (params.type) {
    case "sign_transaction": {
      return {
        chain_type: "eth",
        sign_type: "tx",
        payload: {
          ...basePayload,
          data: {
            transaction: toSignableTransaction(params.data.transaction),
          },
        },
      };
    }

    case "personal_sign": {
      return {
        chain_type: "eth",
        sign_type: "arbitrary",
        payload: {
          ...basePayload,
          data: {
            message: params.data.message,
          },
        },
      };
    }

    case "sign_typedData_v4": {
      return {
        chain_type: "eth",
        sign_type: "eip712",
        payload: {
          ...basePayload,
          data: {
            version: "4",
            serialized_typed_data: params.data.serializedTypedData,
          },
        },
      };
    }

    default: {
      throw new EthereumRpcError(
        RpcErrorCode.Internal,
        `Unknown sign method: ${(params as any).type}`,
      );
    }
  }
}

async function handleSigningFlow(
  okoEthWallet: OkoEthWalletInterface,
  data: MakeEthereumSigData,
): Promise<EthSignResult> {
  const okoWallet = okoEthWallet.okoWallet;

  try {
    const modal_id = uuidv4();

    const openModalMsg: OkoWalletMsgOpenModal = {
      target: "oko_attached",
      msg_type: "open_modal",
      payload: {
        modal_type: "eth/make_signature",
        modal_id,
        data,
      },
    };

    const openModalResp = await okoWallet.openModal(openModalMsg);

    if (!openModalResp.success) {
      throw new Error(
        `Error getting open modal response: ${openModalResp.err}`,
      );
    }

    const ackPayload = openModalResp.data;

    if (ackPayload.modal_type !== "eth/make_signature") {
      throw new Error("Invalid modal type response");
    }

    switch (ackPayload.type) {
      case "approve": {
        if (ackPayload.data.chain_type !== "eth") {
          throw new Error("Invalid chain type sig response");
        }

        const makeEthereumSigResult = ackPayload.data;

        return makeEthereumSigResult.sig_result;
      }

      case "reject": {
        throw new EthereumRpcError(
          ProviderRpcErrorCode.UserRejectedRequest,
          "User rejected the signature request",
        );
      }

      case "error": {
        const message = `${ackPayload.error.type}`;

        throw new Error(message);
      }

      default: {
        throw new Error(
          `unreachable response type: ${(openModalResp as any).type}`,
        );
      }
    }
  } catch (error) {
    // if it's already a JSON-RPC compatible error, just throw it
    if (error && typeof error === "object" && "code" in error) {
      throw error;
    }

    let message = "unknown empty error";
    if (error instanceof Error) {
      if (error.message && error.message.length > 0) {
        message = error.message;
      }
    } else {
      message = String(error);
    }

    throw new EthereumRpcError(RpcErrorCode.Internal, message);
  } finally {
    okoWallet.closeModal();
  }
}
