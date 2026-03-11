/**
 * Redirects the callback page to /mobile/login/complete with the OAuth tokens.
 * Used in the OS-browser login flow where keygen runs inside the browser.
 *
 * The /mobile/login/complete page will:
 * 1. Load attached iframe
 * 2. Send oauth_info_pass
 * 3. Wait for keygen
 * 4. Upload encrypted key shares
 * 5. Deep link back to app
 */
export function redirectToMobileLoginComplete(params: {
  provider: string;
  api_key: string;
  target_origin: string;
  auth_type: string;
  // Google/Email
  access_token?: string | null;
  id_token?: string | null;
  // Discord/X/GitHub
  code?: string | null;
}): void {
  const url = new URL("/mobile/login/complete", window.location.origin);

  url.searchParams.set("provider", params.provider);
  url.searchParams.set("api_key", params.api_key);
  url.searchParams.set("host_origin", params.target_origin);
  url.searchParams.set("auth_type", params.auth_type);

  if (params.access_token) {
    url.searchParams.set("access_token", params.access_token);
  }
  if (params.id_token) {
    url.searchParams.set("id_token", params.id_token);
  }
  if (params.code) {
    url.searchParams.set("code", params.code);
  }

  window.location.href = url.toString();
}
