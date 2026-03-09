import * as WebBrowser from "expo-web-browser";
import type {
  OkoWalletMsg,
  SignInType,
  OAuthPayload,
  OAuthTokenRequestPayload,
} from "@oko-wallet/oko-sdk-core";
import type { WebViewBridge } from "../bridge/WebViewBridge";

export interface SignInOptions {
  redirectScheme: string;
}

const DEFAULT_REDIRECT_SCHEME = "okowallet";

/**
 * Sign in via system browser.
 *
 * 1. Request OAuth URL from attached (via bridge)
 * 2. Open system browser (expo-web-browser)
 * 3. User completes OAuth
 * 4. Callback page redirects to deep link
 * 5. Parse deep link params
 * 6. Send oauth_info_pass to attached (via bridge)
 */
export async function signInRN(
  bridge: WebViewBridge,
  type: SignInType,
  apiKey: string,
  options?: SignInOptions,
): Promise<void> {
  const redirectScheme =
    options?.redirectScheme ?? DEFAULT_REDIRECT_SCHEME;

  // 1. Get OAuth URL from attached
  const urlAck = await bridge.sendMessage({
    target: "oko_attached",
    msg_type: "generate_oauth_url",
    payload: {
      provider: type,
      apiKey,
      targetOrigin: `${redirectScheme}://`,
      redirectScheme,
    },
  } as OkoWalletMsg);

  if (urlAck.msg_type !== "generate_oauth_url_ack") {
    throw new Error(
      `Failed to generate OAuth URL for ${type}: unexpected ack type ${urlAck.msg_type}`,
    );
  }

  if (!urlAck.payload.success) {
    throw new Error(
      `Failed to generate OAuth URL for ${type}: ${urlAck.payload.err}`,
    );
  }

  const oauthUrl: string = urlAck.payload.data.url;

  // 2. Open system browser
  const result = await WebBrowser.openAuthSessionAsync(
    oauthUrl,
    `${redirectScheme}://`,
  );

  if (result.type !== "success") {
    throw new Error(
      `OAuth sign-in cancelled or failed: ${result.type}`,
    );
  }

  // 3. Parse the callback URL
  const callbackUrl = new URL(result.url);

  // 4. Build oauth_info_pass payload based on provider
  const oauthPayload = buildOAuthPayload(type, callbackUrl, apiKey, redirectScheme);

  // 5. Send to attached for processing
  const passAck = await bridge.sendMessage({
    target: "oko_attached",
    msg_type: "oauth_info_pass",
    payload: oauthPayload,
  } as unknown as OkoWalletMsg);

  if (passAck.msg_type !== "oauth_info_pass_ack") {
    throw new Error(
      `oauth_info_pass failed: unexpected ack type ${passAck.msg_type}`,
    );
  }
}

function buildOAuthPayload(
  provider: SignInType,
  callbackUrl: URL,
  apiKey: string,
  redirectScheme: string,
): OAuthPayload | OAuthTokenRequestPayload {
  const params = callbackUrl.searchParams;

  const targetOrigin = `${redirectScheme}://`;

  switch (provider) {
    case "google": {
      return {
        access_token: params.get("access_token") ?? "",
        id_token: params.get("id_token") ?? "",
        api_key: apiKey,
        target_origin: targetOrigin,
        auth_type: "google",
      } satisfies OAuthPayload;
    }

    case "x": {
      return {
        code: params.get("code") ?? "",
        api_key: apiKey,
        target_origin: targetOrigin,
        auth_type: "x",
      };
    }

    case "discord": {
      return {
        code: params.get("code") ?? "",
        api_key: apiKey,
        target_origin: targetOrigin,
        auth_type: "discord",
      };
    }

    case "github": {
      return {
        code: params.get("code") ?? "",
        api_key: apiKey,
        target_origin: targetOrigin,
        auth_type: "github",
      };
    }

    case "telegram": {
      const telegramData: Record<string, string> = {};
      for (const [key, value] of params.entries()) {
        telegramData[key] = value;
      }
      return {
        telegram_data: telegramData,
        api_key: apiKey,
        target_origin: targetOrigin,
        auth_type: "telegram",
      };
    }

    case "email": {
      // Email uses Auth0 implicit flow — same shape as Google (access_token + id_token)
      return {
        access_token: params.get("access_token") ?? "",
        id_token: params.get("id_token") ?? "",
        api_key: apiKey,
        target_origin: targetOrigin,
        auth_type: "auth0",
      } satisfies OAuthPayload;
    }

    default:
      throw new Error(`Unsupported sign-in provider: ${provider}`);
  }
}
