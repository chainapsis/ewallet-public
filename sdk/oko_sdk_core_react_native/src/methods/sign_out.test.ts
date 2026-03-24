import assert from "node:assert/strict";
import test from "node:test";

import { buildSignOutUrl } from "./sign_out_url";

test("buildSignOutUrl includes client_random in hash", () => {
  const url = new URL(
    buildSignOutUrl("https://mobile.oko.app", "okowallet", "1234567890abcdef"),
  );

  assert.equal(url.pathname, "/mobile/sign-out");
  assert.equal(url.searchParams.get("host_origin"), "https://mobile.oko.app");
  assert.equal(url.searchParams.get("redirect_scheme"), "okowallet");
  assert.equal(url.hash, "#client_random=1234567890abcdef");
});

test("buildSignOutUrl omits hash when client_random is missing", () => {
  const url = new URL(buildSignOutUrl("https://mobile.oko.app", "okowallet"));

  assert.equal(url.hash, "");
});
