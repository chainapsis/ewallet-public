import type { MakeSigError, SignOutput } from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import { makeSignOutput } from "@oko-wallet-attached/crypto/sign";
import { useAppState } from "@oko-wallet-attached/store/app";

export async function makeSignature(
  hostOrigin: string,
  msg: Uint8Array<ArrayBufferLike>,
  getIsAborted: () => boolean,
): Promise<Result<SignOutput, MakeSigError>> {
  const appState = useAppState.getState();

  const walletState = appState.getWallet(hostOrigin);
  const apiKey = appState.getApiKey(hostOrigin);
  const keyshare_1 = appState.getKeyshare_1(hostOrigin);
  const jwtToken = appState.getAuthToken(hostOrigin);

  if (!apiKey) {
    return { success: false, err: { type: "api_key_not_found" } };
  }

  if (!keyshare_1) {
    return { success: false, err: { type: "key_share_not_combined" } };
  }

  if (!walletState) {
    return { success: false, err: { type: "wallet_not_found" } };
  }

  if (!jwtToken) {
    return { success: false, err: { type: "jwt_not_found" } };
  }

  const sign_output = await makeSignOutput(
    msg,
    walletState.publicKey,
    keyshare_1,
    apiKey,
    jwtToken,
    getIsAborted,
  );

  return sign_output;
}
