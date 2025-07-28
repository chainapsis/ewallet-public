import type { SignOutput } from "@keplr-ewallet/ewallet-sdk-core";
import { type Hex, type Signature, pad, hexToBigInt } from "viem";
import { secp256k1 } from "@noble/curves/secp256k1";

// ref: fullSignatureToEvmSig in cait_sith_keplr_addon/src/tests/eth_tx_sign.test.ts
export const encodeEthereumSignature = (
  signOutput: SignOutput,
  chainId?: number,
): Signature => {
  const { sig, is_high } = signOutput;

  // 1) Decompress R
  const bigRHex = "0x" + sig.big_r.replace(/^0x/, "");
  // CHECK: dependency on noble/curves seems to be a mass
  // Secp256k1.uncompressPubkey(bigRHex) could work, though it's cosmosjs dependency...
  const uncompressed = secp256k1.getPublicKey(bigRHex, false);

  // 2) Extract x and y
  const xHex = ("0x" + uncompressed.slice(4, 68)) as Hex;
  const yHex = ("0x" + uncompressed.slice(68, 132)) as Hex;

  // 3) Pad x to 32 bytes → r
  const r = pad(xHex, { dir: "left", size: 32 });

  // 4) Determine v from y parity (odd = 28, even = 27)
  const yBigInt = hexToBigInt(yHex);
  const isYOdd = yBigInt % BigInt(2) === BigInt(1);
  let v = isYOdd ? 28 : 27;

  // 5) Flip v if s was normalized (low-s rule)
  if (is_high) {
    v = v === 27 ? 28 : 27;
  }

  // 6) Apply EIP-155 if chainId is given
  if (chainId != null) {
    v += chainId * 2 + 8;
  }

  // 7) Pad s to 32 bytes
  const sHex = ("0x" + sig.s.replace(/^0x/, "")) as Hex;
  const s = pad(sHex, { dir: "left", size: 32 });

  return { r, s, v: BigInt(v) };
};
