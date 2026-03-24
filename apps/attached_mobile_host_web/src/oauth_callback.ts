import {
  buildMobileLoginCompleteUrl,
  getMobileSessionSnapshot,
  hasOAuthPayload,
  inferProviderFromCallbackPath,
  parseOAuthState,
  readOAuthCallbackTokens,
} from "./oauth_callback_utils";

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

  const tokens = readOAuthCallbackTokens(
    window.location.hash,
    window.location.search,
  );
  const parsedState = parseOAuthState(tokens.stateStr);

  let provider = parsedState?.provider ?? "";
  let apiKey = parsedState?.apiKey ?? "";
  let targetOrigin = parsedState?.targetOrigin ?? "";
  let redirectScheme = parsedState?.redirectScheme ?? null;
  let clientRandom = sessionStorage.getItem("oko_mobile_client_random");

  if (!parsedState) {
    const mobileSession = getMobileSessionSnapshot(sessionStorage);
    const inferredProvider = inferProviderFromCallbackPath(path);

    if (!mobileSession || !inferredProvider || !hasOAuthPayload(tokens)) {
      return false;
    }

    provider = inferredProvider;
    apiKey = mobileSession.apiKey;
    redirectScheme = mobileSession.redirectScheme;
    clientRandom = mobileSession.clientRandom;
    targetOrigin = window.location.origin;
  }

  const completeUrl = buildMobileLoginCompleteUrl({
    origin: window.location.origin,
    provider,
    apiKey,
    targetOrigin,
    authType: provider,
    redirectScheme,
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    code: tokens.code,
    clientRandom,
  });

  window.location.replace(completeUrl);
  return true;
}
