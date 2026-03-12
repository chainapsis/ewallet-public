import { OkoWallet } from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import type {
  OkoEthWalletInterface,
  OkoEthWalletInitArgs,
} from "@oko-wallet-sdk-eth/types";
import type { OkoEthWalletInitError } from "@oko-wallet-sdk-eth/errors";
import { OkoEthWallet } from "@oko-wallet-sdk-eth/constructor";

export function init(
  args: OkoEthWalletInitArgs,
): Result<OkoEthWalletInterface, OkoEthWalletInitError> {
  const okoEthWalletRes = OkoWallet.init(args);

  if (!okoEthWalletRes.success) {
    console.error(
      "[oko-eth] oko-eth wallet core init fail, err: %s",
      okoEthWalletRes.err,
    );

    return {
      success: false,
      err: {
        type: "oko_eth_wallet_init_fail",
        msg: okoEthWalletRes.err.toString(),
      },
    };
  }

  const instance = new OkoEthWallet(okoEthWalletRes.data);

  return {
    success: true,
    data: instance,
  };
}
