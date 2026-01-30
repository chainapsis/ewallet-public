import { Connection } from "@solana/web3.js";

const DEFAULT_RPC_URL = "https://api.devnet.solana.com";

export const DEVNET_CONNECTION = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEFAULT_RPC_URL,
  "confirmed",
);
