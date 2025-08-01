import {
  initKeplrEwalletCore,
  type KeplrEwalletInitArgs,
} from "@keplr-ewallet/ewallet-sdk-core";

import { CosmosEWallet } from "./cosmos_ewallet";

export type CosmosEWalletArgs = KeplrEwalletInitArgs;

export async function initCosmosEWallet(
  args: CosmosEWalletArgs,
): Promise<CosmosEWallet | null> {
  const eWalletRes = await initKeplrEwalletCore(args);
  if (!eWalletRes.success) {
    console.error("[keplr] ewallet core init failed, err: %s", eWalletRes.err);

    return null;
  }

  return new CosmosEWallet(eWalletRes.data);
}
