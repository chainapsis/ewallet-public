import { encodeSecp256k1Signature } from "@cosmjs/amino";
import type { StdSignature } from "@cosmjs/amino";
import type { SignOutput } from "@keplr-ewallet/ewallet-sdk-core";

export const encodeCosmosSignature = (
  signOutput: SignOutput,
  publicKey: Uint8Array,
): StdSignature => {
  // If rHex is 33 bytes (66 characters), remove the first 2 characters (1 byte)
  const rHexRaw = signOutput.sig.big_r.replace(/^0x/, "");
  const rHex = rHexRaw.length === 66 ? rHexRaw.slice(2) : rHexRaw;
  const sHex = signOutput.sig.s.replace(/^0x/, "").padStart(64, "0");

  const rBuf = Buffer.from(rHex, "hex");
  const sBuf = Buffer.from(sHex, "hex");
  const signature = Buffer.concat([rBuf, sBuf]);

  return encodeSecp256k1Signature(publicKey, signature);
};
