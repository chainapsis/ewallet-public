import {
  initKeplrEwalletCore,
  type KeplrEWallet,
  type KeplrEwalletInitArgs,
} from "@keplr-ewallet/ewallet-sdk-core";

import { CosmosEWallet } from "./cosmos_ewallet";

// export interface CosmosEWalletArgs {
//   eWallet: KeplrEWallet | null;
// }

export async function initCosmosEWallet(
  args: KeplrEwalletInitArgs,
): Promise<CosmosEWallet | null> {
  const eWalletRes = await initKeplrEwalletCore(args);
  if (!eWalletRes.success) {
    console.error("eWallet core init failed, err: %s", eWalletRes.err);

    return null;
  }

  return new CosmosEWallet(eWalletRes.data);
}
