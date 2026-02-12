import type { Bytes32 } from "@oko-wallet/bytes";

export interface PrivateKeyRecords {
  ed25519: Bytes32;
  secp256k1: Bytes32;
}
