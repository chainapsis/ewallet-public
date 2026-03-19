/**
 * Handle OAuth provider callback redirects before React mounts.
 *
 * OAuth providers redirect to real paths like /google/callback with
 * tokens in hash fragment or query params. This function parses the
 * response and redirects to /#/mobile/login/complete with the params.
 *
 * Returns true if the current URL is an OAuth callback (React should
 * NOT mount), false otherwise.
 */
export function handleOAuthCallbackRedirect(): boolean {
  const path = window.location.pathname;
  if (!path.endsWith("/callback")) {
    return false;
  }

  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);

  let accessToken: string | null = null;
  let idToken: string | null = null;
  let code: string | null = null;
  let stateStr: string | null = null;

  // Hash fragment (Google, Auth0/email)
  if (hash && hash.length > 1) {
    const hashParams = new URLSearchParams(hash.substring(1));
    accessToken = hashParams.get("access_token");
    idToken = hashParams.get("id_token");
    stateStr = hashParams.get("state");
  }

  // Query params (X, Discord, GitHub)
  if (!stateStr) {
    code = searchParams.get("code");
    stateStr = searchParams.get("state");
  }

  if (!stateStr) {
    return false;
  }

  // Parse state — JSON (Google, Auth0) or base64+JSON (X, Discord, GitHub)
  let state: Record<string, string> = {};
  try {
    state = JSON.parse(stateStr);
  } catch {
    try {
      state = JSON.parse(atob(stateStr));
    } catch {
      /* ignore */
    }
  }

  const provider = state.provider ?? "";
  const apiKey = state.apiKey ?? "";
  const targetOrigin = state.targetOrigin ?? "";
  const redirectScheme = state.redirectScheme ?? null;

  const params = new URLSearchParams();
  params.set("provider", provider);
  params.set("api_key", apiKey);
  params.set("host_origin", targetOrigin);
  params.set("auth_type", provider);
  if (redirectScheme) {
    params.set("redirect_scheme", redirectScheme);
  }
  if (accessToken) {
    params.set("access_token", accessToken);
  }
  if (idToken) {
    params.set("id_token", idToken);
  }
  if (code) {
    params.set("code", code);
  }

  const completeUrl = new URL(
    `/mobile/login/complete?${params.toString()}`,
    window.location.origin,
  );
  const clientRandom = sessionStorage.getItem("oko_mobile_client_random");
  if (clientRandom) {
    completeUrl.hash = `client_random=${encodeURIComponent(clientRandom)}`;
  }

  window.location.replace(completeUrl.toString());
  return true;
}
