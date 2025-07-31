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

// TODO: add chain icons and other chain info (op-stack, zksync, etc)
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
