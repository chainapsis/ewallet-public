import {
  ETHEREUM_MAINNET_CHAIN_ID,
  SOLANA_MAINNET_CHAIN_ID,
} from "@oko-wallet-user-dashboard/utils/chain";

export const TRANSACTION_HISTORY_SUPPORT_LIST = [
  {
    chainId: "cosmoshub-4",
    explorerName: "Mintscan",
    explorerUrl: "https://www.mintscan.io/cosmos",
    addressPath: "/address",
  },
  {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    explorerName: "Etherscan",
    explorerUrl: "https://etherscan.io",
    addressPath: "/address",
  },
  {
    chainId: SOLANA_MAINNET_CHAIN_ID,
    explorerName: "Solscan",
    explorerUrl: "https://solscan.io",
    addressPath: "/account",
  },
  {
    chainId: "interwoven-1",
    explorerName: "Initia Scan",
    explorerUrl: "https://scan.initia.xyz/interwoven-1",
    addressPath: "/address",
  },
  {
    chainId: "osmosis-1",
    explorerName: "Mintscan",
    explorerUrl: "https://www.mintscan.io/osmosis",
    addressPath: "/address",
  },
];
