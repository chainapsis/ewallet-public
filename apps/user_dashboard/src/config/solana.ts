import { S3_BUCKET_URL } from "@oko-wallet-user-dashboard/fetch";
import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";

// CAIP-2 standard chain IDs using genesis hash (first 32 characters)
export const SOLANA_MAINNET: ModularChainInfo = {
  chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  chainName: "Solana",
  chainSymbolImageUrl: `${S3_BUCKET_URL}/icons/solana.png`,
  isTestnet: false,
  solana: {
    rpc: "https://api.mainnet-beta.solana.com",
    currencies: [
      {
        coinDenom: "SOL",
        coinMinimalDenom: "lamports",
        coinDecimals: 9,
        coinGeckoId: "solana",
      },
    ],
  },
};

export const SOLANA_DEVNET: ModularChainInfo = {
  chainId: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  chainName: "Solana Devnet",
  chainSymbolImageUrl: `${S3_BUCKET_URL}/icons/solana.png`,
  isTestnet: true,
  solana: {
    rpc: "https://api.devnet.solana.com",
    currencies: [
      {
        coinDenom: "SOL",
        coinMinimalDenom: "lamports",
        coinDecimals: 9,
      },
    ],
  },
};

export const SOLANA_TESTNET: ModularChainInfo = {
  chainId: "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
  chainName: "Solana Testnet",
  chainSymbolImageUrl: `${S3_BUCKET_URL}/icons/solana.png`,
  isTestnet: true,
  solana: {
    rpc: "https://api.testnet.solana.com",
    currencies: [
      {
        coinDenom: "SOL",
        coinMinimalDenom: "lamports",
        coinDecimals: 9,
      },
    ],
  },
};
