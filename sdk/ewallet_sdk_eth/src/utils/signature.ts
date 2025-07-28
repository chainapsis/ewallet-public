import type {
  SignableMessage,
  TransactionSerializable,
  TypedDataDefinition,
  Signature,
  Hex,
  Address,
  ByteArray,
} from "viem";
import {
  serializeTransaction,
  hashMessage,
  hashTypedData,
  keccak256,
  toBytes,
  pad,
  toHex,
} from "viem";
import { publicKeyToAddress } from "viem/accounts";
import type { SignOutput } from "@keplr-ewallet/ewallet-sdk-core";
import { secp256k1 } from "@noble/curves/secp256k1";

// ref: fullSignatureToEvmSig in cait_sith_keplr_addon/src/tests/eth_tx_sign.test.ts
export const encodeEthereumSignature = (
  signOutput: SignOutput,
  chainId?: number,
): Signature => {
  const { sig, is_high } = signOutput;

  // 1) Decompress R which is compressed public key
  const bigRHexWithout0x = sig.big_r.replace(/^0x/, "");

  // 2) Parse the compressed public key point
  const point = secp256k1.Point.fromHex(bigRHexWithout0x);

  // 3) Pad x to 32 bytes → r
  const r = pad(toHex(point.x), { dir: "left", size: 32 });

  // 4) Determine v from y parity (odd = 28, even = 27)
  const isYOdd = point.y % BigInt(2) === BigInt(1);
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
