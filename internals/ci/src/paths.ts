import path from "node:path";

export const paths = (function() {
  const root = path.join(__dirname, "../../../");

  const stdlib = path.join(__dirname, "../../../stdlib_js");

  const sdk_core = path.join(__dirname, "../../../sdk/ewallet_sdk_core/");

  const sdk_eth = path.join(__dirname, "../../../sdk/ewallet_sdk_eth/");

  const sdk_cosmos = path.join(__dirname, "../../../sdk/ewallet_sdk_cosmos/");

  const sandbox_simple_host = path.join(
    __dirname,
    "../../../sdk/sandboxes/sandbox_simple_host/",
  );

  const crypto_bytes = path.join(__dirname, "../../../crypto/bytes/");

  const credential_vault_pg_interface = path.join(
    __dirname,
    "../../../credential_vault/pg_interface/",
  );

  return {
    root,
    stdlib,
    sdk_core,
    sdk_eth,
    sdk_cosmos,
    crypto_bytes,
    credential_vault_pg_interface,
    sandbox_simple_host,
  };
})();
