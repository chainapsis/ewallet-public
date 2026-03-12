import { OkoWallet, type OkoWalletInitArgs } from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";
import type { OkoCosmosWalletInitError } from "@oko-wallet-sdk-cosmos/errors";
import { OkoCosmosWallet } from "@oko-wallet-sdk-cosmos/constructor";

export function init(
  args: OkoWalletInitArgs,
): Result<OkoCosmosWalletInterface, OkoCosmosWalletInitError> {
  const walletRes = OkoWallet.init(args);
  if (!walletRes.success) {
    console.error(
      "[oko-cosmos] cosmos wallet core init fail, err: %s",
      walletRes.err,
    );

    return {
      success: false,
      err: {
        type: "oko_cosmos_wallet_init_fail",
        msg: walletRes.err.toString(),
      },
    };
  }

  const instance = new OkoCosmosWallet(walletRes.data);

  return { success: true, data: instance };
}
