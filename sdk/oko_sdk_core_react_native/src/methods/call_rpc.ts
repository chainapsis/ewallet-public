import { buildRpcUrl, parseRpcResultFromCallbackUrl } from "../codec/rpc_codec";
import {
  getServerRedirectScheme,
  openAuthSession,
} from "../native/OkoAuthBrowser";

/**
 * Generic RPC call via OS browser.
 *
 * Opens the /mobile/rpc page with the given method and payload,
 * waits for the result via scheme redirect callback.
 */
export async function callRpc<T = unknown>(
  sdkEndpoint: string,
  method: string,
  payload: unknown,
  apiKey: string,
  redirectScheme: string,
  expectedPublicKey?: string | null,
  clientRandom?: string | null,
  androidCallbackScheme?: string,
): Promise<T> {
  const serverScheme = getServerRedirectScheme(
    redirectScheme,
    androidCallbackScheme,
  );
  const { url: rpcUrl } = buildRpcUrl(
    sdkEndpoint,
    method,
    payload,
    apiKey,
    serverScheme,
    expectedPublicKey,
    clientRandom,
  );

  const result = await openAuthSession(
    rpcUrl,
    redirectScheme,
    androidCallbackScheme,
  );

  if (result.type === "cancel") {
    throw new Error(`RPC call "${method}" cancelled`);
  }

  return parseRpcResultFromCallbackUrl<T>(result.url);
}
