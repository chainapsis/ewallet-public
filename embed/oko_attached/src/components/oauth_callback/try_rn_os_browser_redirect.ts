import { redirectToRnLoginComplete } from "./redirect_to_rn_login_complete";

/**
 * Check if we're in the RN OS-browser login flow by looking at sessionStorage.
 *
 * The /rn/login page stores `oko_rn_device_key` in sessionStorage before
 * redirecting to the OAuth provider. Since ASWebAuthenticationSession
 * preserves sessionStorage across redirects within the same session,
 * we can use this as a reliable signal.
 *
 * This serves as a fallback when the OAuth state parameter doesn't
 * contain rnOsBrowser (e.g., due to provider state handling quirks).
 *
 * Returns true if the redirect was initiated.
 */
export function tryRnOsBrowserRedirect(params: {
  provider: string;
  auth_type: string;
  access_token?: string | null;
  id_token?: string | null;
  code?: string | null;
}): boolean {
  try {
    const deviceKey = sessionStorage.getItem("oko_rn_device_key");
    const apiKey = sessionStorage.getItem("oko_rn_api_key");

    if (!deviceKey) return false;

    redirectToRnLoginComplete({
      provider: params.provider,
      api_key: apiKey ?? "",
      target_origin: window.location.origin,
      auth_type: params.auth_type,
      access_token: params.access_token,
      id_token: params.id_token,
      code: params.code,
    });
    return true;
  } catch {
    return false;
  }
}
