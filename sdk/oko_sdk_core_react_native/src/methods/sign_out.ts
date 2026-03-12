import {
  getServerRedirectScheme,
  openAuthSession,
} from "../native/OkoAuthBrowser";

const DEFAULT_REDIRECT_SCHEME = "okowallet";

export async function signOutRN(
  sdkEndpoint: string,
  redirectScheme = DEFAULT_REDIRECT_SCHEME,
): Promise<void> {
  const serverScheme = getServerRedirectScheme(redirectScheme);
  const signOutUrl = buildSignOutUrl(sdkEndpoint, serverScheme);
  const result = await openAuthSession(signOutUrl, redirectScheme);

  if (result.type === "cancel") {
    throw new Error("Sign-out cancelled");
  }
}

function buildSignOutUrl(sdkEndpoint: string, redirectScheme: string): string {
  const url = new URL("/mobile/sign-out", sdkEndpoint);
  url.searchParams.set("host_origin", sdkEndpoint);
  url.searchParams.set("redirect_scheme", redirectScheme);
  return url.toString();
}
