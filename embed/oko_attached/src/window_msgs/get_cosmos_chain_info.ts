import { ChainIdHelper } from "@keplr-wallet/cosmos";
import type { ChainInfo } from "@keplr-wallet/types";
import type {
  OkoWalletMsgGetCosmosChainInfo,
  OkoWalletMsgGetCosmosChainInfoAck,
} from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import {
  filterCosmosChains,
  getAllChainsCached,
} from "@oko-wallet-attached/requests/chain_infos";

export async function handleGetCosmosChain(
  ctx: MsgEventContext,
  message: OkoWalletMsgGetCosmosChainInfo,
): Promise<void> {
  const { port } = ctx;

  try {
    console.debug("[attached] handling get_cosmos_chain");

    if (message.msg_type !== "get_cosmos_chain_info") {
      throw new Error("Invalid message type");
    }

    const chainId = message.payload.chain_id;

    const allChains = await getAllChainsCached();
    const chainInfos = filterCosmosChains(allChains);

    let resultChains: ChainInfo[] = [];

    if (chainId) {
      const chainIdentifier = ChainIdHelper.parse(chainId).identifier;
      const foundChain = chainInfos.find(
        (chain) =>
          ChainIdHelper.parse(chain.chainId).identifier === chainIdentifier,
      );
      if (!foundChain) {
        throw new Error(`Chain not found: ${chainIdentifier}`);
      }
      resultChains = [foundChain];
    } else {
      resultChains = chainInfos;
    }

    const ack: OkoWalletMsgGetCosmosChainInfoAck = {
      target: OKO_SDK_TARGET,
      msg_type: "get_cosmos_chain_info_ack",
      payload: {
        success: true,
        data: resultChains,
      },
    };

    port.postMessage(ack);
  } catch (error: any) {
    console.error("[attached] handling get_cosmos_chain fail, err: %o", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    const ack: OkoWalletMsgGetCosmosChainInfoAck = {
      target: OKO_SDK_TARGET,
      msg_type: "get_cosmos_chain_info_ack",
      payload: {
        success: false,
        err: errorMessage,
      },
    };

    port.postMessage(ack);
  }
}
