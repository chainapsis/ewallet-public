import {
  convertChainInfoToRpcChain,
  DEFAULT_CHAIN_ID,
  sendGetEthChainInfo,
} from "@oko-wallet-sdk-eth/chains";
import {
  OkoEIP1193Provider,
  type OkoEthRpcChain,
} from "@oko-wallet-sdk-eth/provider";
import type { OkoEthWalletInterface } from "@oko-wallet-sdk-eth/types";
import { parseChainId } from "@oko-wallet-sdk-eth/utils";

export async function getEthereumProvider(
  this: OkoEthWalletInterface,
): Promise<OkoEIP1193Provider> {
  if (this.provider !== null) {
    return this.provider;
  }

  await this.waitUntilInitialized;

  const chainInfoRes = await sendGetEthChainInfo(this.okoWallet);
  if (!chainInfoRes.success) {
    throw new Error(
      `Failed to get chain registry response: ${chainInfoRes.err.toString()}`,
    );
  }

  let rpcChains: OkoEthRpcChain[] = chainInfoRes.data
    .map((chain) => convertChainInfoToRpcChain(chain))
    .filter((chain) => chain !== null);

  if (rpcChains.length === 0) {
    throw new Error("No chains found");
  }

  const activeChain = rpcChains.find(
    (chain) => parseChainId(chain.chainId) === DEFAULT_CHAIN_ID,
  );

  if (activeChain !== undefined) {
    rpcChains = [
      activeChain,
      ...rpcChains.filter(
        (chain) => parseChainId(chain.chainId) !== DEFAULT_CHAIN_ID,
      ),
    ];
  }

  this.provider = new OkoEIP1193Provider({
    signer: {
      sign: (params) => this.makeSignature(params),
      getAddress: () => this.state.address,
    },
    chains: rpcChains,
  });

  return this.provider;
}
