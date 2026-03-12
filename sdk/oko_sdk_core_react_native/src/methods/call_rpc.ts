import {
  getServerRedirectScheme,
  openAuthSession,
} from "../native/OkoAuthBrowser";
import {
  buildRpcUrl,
  parseRpcResultFromCallbackUrl,
} from "../codec/rpc_codec";

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
): Promise<T> {
  const serverScheme = getServerRedirectScheme(redirectScheme);
  const { url: rpcUrl } = buildRpcUrl(
    sdkEndpoint,
    method,
    payload,
    apiKey,
    serverScheme,
  );

  const result = await openAuthSession(rpcUrl, redirectScheme);

  if (result.type === "cancel") {
    throw new Error(`RPC call "${method}" cancelled`);
  }

  return parseRpcResultFromCallbackUrl<T>(result.url);
}
