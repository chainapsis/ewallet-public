import { OkoWallet } from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import type {
  OkoSvmWalletInterface,
  OkoSvmWalletInitArgs,
} from "@oko-wallet-sdk-svm/types";
import type { OkoSvmWalletInitError } from "@oko-wallet-sdk-svm/errors";
import { OkoSvmWallet } from "@oko-wallet-sdk-svm/constructor";

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
    data: new (
      OkoSvmWallet as unknown as new (
        ...args: unknown[]
      ) => OkoSvmWalletInterface
    )(okoSvmWalletRes.data, chainOptions),
  };
}
