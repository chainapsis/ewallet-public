import assert from "node:assert/strict";
import test from "node:test";

import { buildIframeSrc } from "./app/mobile/_shared/build_iframe_src";
import { parseClientRandomFromHash } from "./app/mobile/_shared/parse_client_random";
import {
  buildMobileLoginCompleteUrl,
  getMobileSessionSnapshot,
  inferProviderFromCallbackPath,
  parseOAuthState,
  readOAuthCallbackTokens,
} from "./oauth_callback_utils";

test("missing state with mobile markers can infer provider and preserve client_random", () => {
  const tokens = readOAuthCallbackTokens("", "?code=oauth-code");
  const sessionStorage = {
    getItem(key: string) {
      const data: Record<string, string> = {
        oko_mobile_redirect_scheme: "okowallet",
        oko_mobile_api_key: "api-key",
        oko_mobile_client_random: "1234567890abcdef",
      };
      return data[key] ?? null;
    },
  };

  const mobileSession = getMobileSessionSnapshot(sessionStorage);
  assert.ok(mobileSession);
  assert.equal(inferProviderFromCallbackPath("/google/callback"), "google");

  const completeUrl = new URL(
    buildMobileLoginCompleteUrl({
      origin: "https://mobile.oko.app",
      provider: "google",
      apiKey: mobileSession.apiKey,
      targetOrigin: "https://mobile.oko.app",
      authType: "google",
      redirectScheme: mobileSession.redirectScheme,
      code: tokens.code,
      clientRandom: mobileSession.clientRandom,
    }),
  );

  assert.equal(completeUrl.pathname, "/mobile/login/complete");
  assert.equal(completeUrl.searchParams.get("provider"), "google");
  assert.equal(completeUrl.searchParams.get("redirect_scheme"), "okowallet");
  assert.equal(completeUrl.searchParams.get("code"), "oauth-code");
  assert.equal(completeUrl.hash, "#client_random=1234567890abcdef");
});

test("parseOAuthState returns null for unparseable state", () => {
  assert.equal(parseOAuthState("%%%not-json%%%"), null);
});

test("provider inference maps /email/callback to auth0", () => {
  assert.equal(inferProviderFromCallbackPath("/email/callback"), "auth0");
  assert.equal(inferProviderFromCallbackPath("/discord/callback"), "discord");
  assert.equal(inferProviderFromCallbackPath("/not-a-callback"), null);
});

test("missing mobile markers does not create a fallback session snapshot", () => {
  const sessionStorage = {
    getItem() {
      return null;
    },
  };

  assert.equal(getMobileSessionSnapshot(sessionStorage), null);
});

test("client_random hash can be forwarded into iframe src", () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: {
      hash: "#client_random=1234567890abcdef",
    },
  } as Window & typeof globalThis;

  try {
    const clientRandom = parseClientRandomFromHash();
    const iframeSrc = new URL(
      buildIframeSrc(
        "https://mobile.oko.app",
        "api-key",
        clientRandom ?? undefined,
      ),
    );

    assert.equal(clientRandom, "1234567890abcdef");
    assert.equal(
      iframeSrc.searchParams.get("client_random"),
      "1234567890abcdef",
    );
  } finally {
    globalThis.window = originalWindow;
  }
});
