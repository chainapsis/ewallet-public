import type { ChainInfo } from "@keplr-wallet/types";
import type {
  OkoWalletMsgGetEthChainInfo,
  OkoWalletMsgGetEthChainInfoAck,
} from "@oko-wallet/oko-sdk-core";

import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import {
  filterEthChains,
  getAllChainsCached,
} from "@oko-wallet-attached/requests/chain_infos";

export async function handleGetEthChain(
  ctx: MsgEventContext,
  message: OkoWalletMsgGetEthChainInfo,
): Promise<void> {
  const { port } = ctx;

  try {
    console.debug("[attached] handling get_eth_chain");

    if (message.msg_type !== "get_eth_chain_info") {
      throw new Error("Invalid message type");
    }

    const chainId = message.payload.chain_id;

    const allChains = await getAllChainsCached();
    // SDK's OkoEIP1193Provider rejects the entire provider construction if any
    // chain's native currency symbol is outside 1-8 chars. Drop registry
    // entries that would trip that validator so a single bad chain doesn't
    // block the whole EVM provider.
    const chainInfos = filterEthChains(allChains).filter((c) => {
      const symbol = c.currencies[0]?.coinDenom;
      return symbol !== undefined && symbol.length >= 1 && symbol.length <= 8;
    });

    let resultChains: ChainInfo[] = [];

    let formattedChainId = chainId;
    if (chainId) {
      formattedChainId = chainId.startsWith("eip155:")
        ? chainId
        : `eip155:${parseInt(chainId, 10)}`;
    }

    if (formattedChainId) {
      const foundChain = chainInfos.find(
        (chain) => chain.chainId === formattedChainId,
      );
      if (!foundChain) {
        throw new Error(`Chain not found: ${formattedChainId}`);
      }
      resultChains = [foundChain];
    } else {
      resultChains = chainInfos;
    }

    const ack: OkoWalletMsgGetEthChainInfoAck = {
      target: OKO_SDK_TARGET,
      msg_type: "get_eth_chain_info_ack",
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

    const ack: OkoWalletMsgGetEthChainInfoAck = {
      target: OKO_SDK_TARGET,
      msg_type: "get_eth_chain_info_ack",
      payload: {
        success: false,
        err: errorMessage,
      },
    };

    port.postMessage(ack);
  }
}
