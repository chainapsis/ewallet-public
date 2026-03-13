"use client";

import { useEffect } from "react";

/**
 * Generic OAuth callback handler for all providers.
 *
 * Parses OAuth response from either:
 * - Hash fragment (Google, Auth0/email): #access_token=...&id_token=...&state=JSON
 * - Query params (X, Discord, GitHub): ?code=...&state=base64(JSON)
 *
 * Then redirects to /mobile/login/complete with all params.
 */
export function OAuthCallbackRedirect() {
  useEffect(() => {
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

    if (!stateStr) return;

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

    const url = new URL("/mobile/login/complete", window.location.origin);
    url.searchParams.set("provider", provider);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("host_origin", targetOrigin);
    url.searchParams.set("auth_type", provider);
    if (redirectScheme) {
      url.searchParams.set("redirect_scheme", redirectScheme);
    }
    if (accessToken) {
      url.searchParams.set("access_token", accessToken);
    }
    if (idToken) {
      url.searchParams.set("id_token", idToken);
    }
    if (code) {
      url.searchParams.set("code", code);
    }

    window.location.href = url.toString();
  }, []);

  return (
    <div style={{ textAlign: "center", fontSize: 16 }}>Redirecting...</div>
  );
}
