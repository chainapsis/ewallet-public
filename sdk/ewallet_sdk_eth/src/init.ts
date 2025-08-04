import {
  initKeplrEwalletCore,
  type KeplrEwalletInitArgs,
} from "@keplr-ewallet/ewallet-sdk-core";

import { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

export async function initEthEWallet(
  args: KeplrEwalletInitArgs,
): Promise<EthEWallet | null> {
  const eWalletRes = await initKeplrEwalletCore(args);

  if (!eWalletRes.success) {
    console.error("[keplr] ewallet core init failed, err: %s", eWalletRes.err);
    return null;
  }
  const ethEWallet = new EthEWallet(eWalletRes.data);

  return ethEWallet;
}
