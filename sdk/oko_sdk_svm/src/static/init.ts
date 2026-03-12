import { OkoWallet } from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import { OkoSvmWallet } from "@oko-wallet-sdk-svm/constructor";
import type { OkoSvmWalletInitError } from "@oko-wallet-sdk-svm/errors";
import type {
  OkoSvmWalletInitArgs,
  OkoSvmWalletInterface,
} from "@oko-wallet-sdk-svm/types";

export function init(
  args: OkoSvmWalletInitArgs,
): Result<OkoSvmWalletInterface, OkoSvmWalletInitError> {
  const okoSvmWalletRes = OkoWallet.init(args);

  if (!okoSvmWalletRes.success) {
    console.error(
      "[oko-svm] oko-svm wallet core init fail, err: %s",
      okoSvmWalletRes.err,
    );

    return {
      success: false,
      err: {
        type: "oko_svm_wallet_init_fail",
        msg: okoSvmWalletRes.err.toString(),
      },
    };
  }

  const chainOptions = {
    chain_id: args.chain_id,
  };

  return {
    success: true,
    data: new OkoSvmWallet(okoSvmWalletRes.data, chainOptions),
  };
}
