import { Bytes } from "@oko-wallet/bytes";
import type { Bytes as BytesType } from "@oko-wallet/bytes";

export interface ServerKeypair {
  privateKey: BytesType<32>;
  publicKey: BytesType<32>;
}

function createKeypair(privateHex: string, publicHex: string): ServerKeypair {
  const privRes = Bytes.fromHexString(privateHex, 32);
  const pubRes = Bytes.fromHexString(publicHex, 32);

  if (!privRes.success || !pubRes.success) {
    throw new Error("Invalid test keypair hex");
  }

  return {
    privateKey: privRes.data,
    publicKey: pubRes.data,
  };
}

export const OKO_API_KEYPAIR = createKeypair(
  "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3",
);

export const KSN_KEYPAIRS: ServerKeypair[] = [
  createKeypair(
    "1111111111111111111111111111111111111111111111111111111111111111",
    "4cb5abf6ad79fbf5abbccafcc269d85cd2651ed4b885b5869f241aedf0a5ba29",
  ),
  createKeypair(
    "2222222222222222222222222222222222222222222222222222222222222222",
    "089c5c406d9aeabd16ece31b57b9e5296ad2d25dd96a778b9fc6c7d41b9adb6d",
  ),
  createKeypair(
    "3333333333333333333333333333333333333333333333333333333333333333",
    "2eb94a9e0aa693d8c4c2c77e1aab3d1b0c8f1e3d5a7b9c1e3f5a7b9d1f3a5b7c",
  ),
];
