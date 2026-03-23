import type { SignInType } from "@oko-wallet/oko-sdk-core";

import {
  getServerRedirectScheme,
  openAuthSession,
} from "../native/OkoAuthBrowser";
import {
  decodeLoginResultFromCallbackUrl,
  type LoginWalletInfo,
} from "./login_url_codec";

export interface SignInOptions {
  redirectScheme: string;
  androidCallbackScheme?: string;
}

export interface SignInResult {
  walletInfo: LoginWalletInfo;
}

const DEFAULT_REDIRECT_SCHEME = "okowallet";

export async function signInRN(
  sdkEndpoint: string,
  type: SignInType,
  apiKey: string,
  options?: SignInOptions,
  clientRandom?: string | null,
): Promise<SignInResult> {
  const redirectScheme = options?.redirectScheme ?? DEFAULT_REDIRECT_SCHEME;
  const androidCallbackScheme = options?.androidCallbackScheme;

  const serverScheme = getServerRedirectScheme(
    redirectScheme,
    androidCallbackScheme,
  );
  const loginUrl = buildLoginUrl(
    sdkEndpoint,
    type,
    apiKey,
    serverScheme,
    clientRandom,
  );

  const result = await openAuthSession(
    loginUrl,
    redirectScheme,
    androidCallbackScheme,
  );

  if (result.type === "cancel") {
    throw new Error("Sign-in cancelled");
  }

  console.info("[oko-rn-login-size] callback", {
    callbackUrlChars: result.url.length,
  });
  const walletInfo = decodeLoginResultFromCallbackUrl(result.url);
  return { walletInfo };
}

function buildLoginUrl(
  sdkEndpoint: string,
  provider: string,
  apiKey: string,
  redirectScheme: string,
  clientRandom?: string | null,
): string {
  const url = new URL("/mobile/login", sdkEndpoint);
  url.searchParams.set("provider", provider);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("redirect_scheme", redirectScheme);
  url.searchParams.set("host_origin", sdkEndpoint);
  if (clientRandom) {
    url.hash = `client_random=${encodeURIComponent(clientRandom)}`;
  }
  return url.toString();
}
