export interface OAuthCallbackTokens {
  accessToken: string | null;
  idToken: string | null;
  code: string | null;
  stateStr: string | null;
}

export interface ParsedOAuthState {
  provider?: string;
  apiKey?: string;
  targetOrigin?: string;
  redirectScheme?: string | null;
}

export interface MobileSessionSnapshot {
  redirectScheme: string;
  apiKey: string;
  clientRandom: string | null;
}

export function readOAuthCallbackTokens(
  hash: string,
  search: string,
): OAuthCallbackTokens {
  let accessToken: string | null = null;
  let idToken: string | null = null;
  let code: string | null = null;
  let stateStr: string | null = null;

  if (hash.length > 1) {
    const hashParams = new URLSearchParams(hash.substring(1));
    accessToken = hashParams.get("access_token");
    idToken = hashParams.get("id_token");
    stateStr = hashParams.get("state");
  }

  if (!stateStr) {
    const searchParams = new URLSearchParams(search);
    code = searchParams.get("code");
    stateStr = searchParams.get("state");
  }

  return { accessToken, idToken, code, stateStr };
}

export function parseOAuthState(
  stateStr: string | null,
): ParsedOAuthState | null {
  if (!stateStr) {
    return null;
  }

  try {
    return JSON.parse(stateStr) as ParsedOAuthState;
  } catch {
    try {
      return JSON.parse(atob(stateStr)) as ParsedOAuthState;
    } catch {
      return null;
    }
  }
}

export function inferProviderFromCallbackPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.at(-1) !== "callback") {
    return null;
  }

  const providerSegment = segments[0];
  if (!providerSegment) {
    return null;
  }

  if (providerSegment === "email") {
    return "auth0";
  }

  return providerSegment;
}

export function hasOAuthPayload(tokens: OAuthCallbackTokens): boolean {
  return Boolean(tokens.accessToken || tokens.idToken || tokens.code);
}

export function getMobileSessionSnapshot(
  storage: Pick<Storage, "getItem">,
): MobileSessionSnapshot | null {
  const redirectScheme = storage.getItem("oko_mobile_redirect_scheme");
  if (!redirectScheme) {
    return null;
  }

  return {
    redirectScheme,
    apiKey: storage.getItem("oko_mobile_api_key") ?? "",
    clientRandom: storage.getItem("oko_mobile_client_random"),
  };
}

export function buildMobileLoginCompleteUrl(args: {
  origin: string;
  provider: string;
  apiKey: string;
  targetOrigin: string;
  authType: string;
  redirectScheme?: string | null;
  accessToken?: string | null;
  idToken?: string | null;
  code?: string | null;
  clientRandom?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("provider", args.provider);
  params.set("api_key", args.apiKey);
  params.set("host_origin", args.targetOrigin);
  params.set("auth_type", args.authType);

  if (args.redirectScheme) {
    params.set("redirect_scheme", args.redirectScheme);
  }
  if (args.accessToken) {
    params.set("access_token", args.accessToken);
  }
  if (args.idToken) {
    params.set("id_token", args.idToken);
  }
  if (args.code) {
    params.set("code", args.code);
  }

  const url = new URL(
    `/mobile/login/complete?${params.toString()}`,
    args.origin,
  );
  if (args.clientRandom) {
    url.hash = `client_random=${encodeURIComponent(args.clientRandom)}`;
  }
  return url.toString();
}
