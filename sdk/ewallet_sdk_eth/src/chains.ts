import {
  arbitrum,
  avalanche,
  base,
  berachain,
  blast,
  citreaTestnet,
  forma,
  mainnet,
  optimism,
  polygon,
  sepolia,
  unichain,
} from "viem/chains";

export const DEFAULT_CHAIN_ID = 1;

export const SUPPORTED_CHAINS = [
  mainnet,
  base,
  optimism,
  arbitrum,
  blast,
  avalanche,
  unichain,
  polygon,
  forma,
  berachain,
  sepolia,
  citreaTestnet,
];

export const SUPPORTED_OP_STACK_CHAINS = [base, optimism, unichain, blast];

export function getChainIconUrl(chainId: string | number) {
  let chainIdNumber: number;
  if (typeof chainId === "string") {
    const [chainNamespace, chainIdStr] = chainId.split(":");
    if (chainNamespace == "eip155") {
      chainIdNumber = parseInt(chainIdStr, 10);
    } else {
      chainIdNumber = parseInt(chainId, 10);
    }
  } else {
    chainIdNumber = chainId;
  }

  return `https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/eip155:${chainIdNumber}/chain.png`;
}
