import { redirectToMobileLoginComplete } from "./redirect_to_mobile_login_complete";
import { storeOAuthRelay } from "./store_oauth_relay";
import { tryMobileOsBrowserRedirect } from "./try_mobile_os_browser_redirect";

/**
 * Unified mobile redirect handler for all OAuth callback pages.
 *
 * Checks three paths in order:
 * 1. OS-browser flow (mobileOsBrowser) → redirect to /mobile/login/complete
 * 2. Legacy relay flow (redirectScheme) → store tokens server-side, deep link
 * 3. SessionStorage fallback → check device_key from /mobile/login page
 *
 * Returns true if a mobile redirect was initiated.
 * Returns false if this is a normal web popup flow.
 */
export async function handleMobileRedirect(params: {
  provider: string;
  authType: string;
  oauthState: {
    apiKey?: string;
    targetOrigin?: string;
    mobileOsBrowser?: boolean;
    redirectScheme?: string;
  };
  access_token?: string | null;
  id_token?: string | null;
  code?: string | null;
}): Promise<boolean> {
  // Web popup flow — not mobile
  if (window.opener) return false;

  const { provider, authType, oauthState } = params;

  // 1. OS-browser flow: redirect to login/complete for keygen
  if (oauthState.mobileOsBrowser) {
    redirectToMobileLoginComplete({
      provider,
      api_key: oauthState.apiKey ?? "",
      target_origin: oauthState.targetOrigin ?? "",
      auth_type: authType,
      access_token: params.access_token,
      id_token: params.id_token,
      code: params.code,
    });
    return true;
  }

  // 2. Legacy relay: store tokens server-side and deep link
  if (oauthState.redirectScheme) {
    const hasTokens = params.access_token || params.id_token || params.code;
    if (hasTokens) {
      const relayPayload: Record<string, unknown> = {
        api_key: oauthState.apiKey,
        target_origin: oauthState.targetOrigin,
        auth_type: authType,
      };
      if (params.access_token) relayPayload.access_token = params.access_token;
      if (params.id_token) relayPayload.id_token = params.id_token;
      if (params.code) relayPayload.code = params.code;

      const relayCode = await storeOAuthRelay(relayPayload);
      window.location.href = `${oauthState.redirectScheme}://oauth-callback?relay_code=${relayCode}`;
      return true;
    }
  }

  // 3. Fallback: check sessionStorage set by /mobile/login page
  return tryMobileOsBrowserRedirect({
    provider,
    auth_type: authType,
    access_token: params.access_token,
    id_token: params.id_token,
    code: params.code,
  });
}
