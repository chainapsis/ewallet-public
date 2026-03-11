import { redirectToMobileLoginComplete } from "./redirect_to_mobile_login_complete";
import { tryMobileOsBrowserRedirect } from "./try_mobile_os_browser_redirect";

/**
 * Unified mobile redirect handler for all OAuth callback pages.
 *
 * Checks two paths in order:
 * 1. OS-browser flow (mobileOsBrowser) → redirect to /mobile/login/complete
 * 2. SessionStorage fallback → check redirect_scheme from /mobile/login page
 *    (catches edge cases where OAuth provider corrupts/truncates state)
 *
 * Returns true if a mobile redirect was initiated.
 * Returns false if this is a normal web popup flow.
 */
export function handleMobileRedirect(params: {
  provider: string;
  authType: string;
  oauthState: {
    apiKey?: string;
    targetOrigin?: string;
    mobileOsBrowser?: boolean;
  };
  access_token?: string | null;
  id_token?: string | null;
  code?: string | null;
}): boolean {
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

  // 2. Fallback: check sessionStorage set by /mobile/login page
  return tryMobileOsBrowserRedirect({
    provider,
    auth_type: authType,
    access_token: params.access_token,
    id_token: params.id_token,
    code: params.code,
  });
}
