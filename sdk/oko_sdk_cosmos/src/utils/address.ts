import type { ChainInfo } from "@keplr-wallet/types";
import { secp256k1 } from "@noble/curves/secp256k1";
import { ripemd160 } from "@noble/hashes/legacy";
import { sha256 } from "@noble/hashes/sha2";
import { keccak_256 } from "@noble/hashes/sha3";
import { bech32 } from "bech32";

export function getCosmosAddress(pubKey: Uint8Array) {
  return ripemd160(sha256(pubKey));
}

export function getEthAddress(pubKey: Uint8Array) {
  let uncompressedPubKey: Uint8Array;

  if (pubKey.length === 65) {
    uncompressedPubKey = pubKey;
  } else if (pubKey.length === 33) {
    const point = secp256k1.Point.fromHex(Buffer.from(pubKey).toString("hex"));
    uncompressedPubKey = point.toBytes(false);
  } else {
    throw new Error(`Invalid public key length: ${pubKey.length}`);
  }

  return keccak_256(uncompressedPubKey.slice(1)).slice(-20);
}

export function getBech32Address(address: Uint8Array, prefix: string) {
  const words = bech32.toWords(address);
  return bech32.encode(prefix, words);
}

export function isEthereumCompatible(chainInfo: ChainInfo) {
  return (
    chainInfo.bip44.coinType === 60 ||
    !!chainInfo.features?.includes("eth-address-gen") ||
    !!chainInfo.features?.includes("eth-key-sign")
  );
}
