import {
  getServerRedirectScheme,
  openAuthSession,
} from "../native/OkoAuthBrowser";
import { buildSignOutUrl } from "./sign_out_url";

const DEFAULT_REDIRECT_SCHEME = "okowallet";

export async function signOutRN(
  sdkEndpoint: string,
  redirectScheme = DEFAULT_REDIRECT_SCHEME,
  androidCallbackScheme?: string,
  clientRandom?: string | null,
): Promise<void> {
  const serverScheme = getServerRedirectScheme(
    redirectScheme,
    androidCallbackScheme,
  );
  const signOutUrl = buildSignOutUrl(sdkEndpoint, serverScheme, clientRandom);
  const result = await openAuthSession(
    signOutUrl,
    redirectScheme,
    androidCallbackScheme,
  );

  if (result.type === "cancel") {
    throw new Error("Sign-out cancelled");
  }
}
