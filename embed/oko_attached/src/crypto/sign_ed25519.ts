import type { MakeSignOutputError } from "@oko-wallet/oko-sdk-core";
import type {
  KeyPackageRaw,
  PublicKeyPackageRaw,
} from "@oko-wallet/oko-types/teddsa";
import type { Result } from "@oko-wallet/stdlib-js";
import { runTeddsaSign } from "@oko-wallet/teddsa-hooks";

import { TSS_V2_ENDPOINT } from "@oko-wallet-attached/requests/oko_api";

export interface KeyPackageEd25519 {
  keyPackage: KeyPackageRaw;
  publicKeyPackage: PublicKeyPackageRaw;
  identifier: Uint8Array;
}

export async function makeSignOutputEd25519(
  message: Uint8Array,
  keyPackage: KeyPackageEd25519,
  apiKey: string,
  authToken: string,
  getIsAborted: () => boolean,
): Promise<Result<Uint8Array, MakeSignOutputError>> {
  const signResult = await runTeddsaSign(
    TSS_V2_ENDPOINT,
    message,
    keyPackage.keyPackage,
    keyPackage.publicKeyPackage,
    authToken,
    apiKey,
    getIsAborted,
  );

  if (!signResult.success) {
    if (signResult.err.type === "aborted") {
      return { success: false, err: { type: "aborted" } };
    }
    return {
      success: false,
      err: {
        type: "sign_fail",
        error: signResult.err,
      },
    };
  }

  return { success: true, data: signResult.data };
}
