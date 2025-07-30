import path from "node:path";

export const paths = (function () {
  const root = path.join(__dirname, "../../../");

  const sdk_core = path.join(__dirname, "../../../sdk/ewallet_sdk_core/");

  const sdk_eth = path.join(__dirname, "../../../sdk/ewallet_sdk_eth/");

  const sdk_cosmos = path.join(__dirname, "../../../sdk/ewallet_sdk_cosmos/");

  const crypto_bytes = path.join(__dirname, "../../../crypto/bytes/");

  return {
    root,
    sdk_core,
    sdk_eth,
    sdk_cosmos,
    crypto_bytes,
  };
})();
