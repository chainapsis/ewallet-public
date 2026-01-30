import type { KeygenOutput } from "@oko-wallet/tecdsa-interface";

import type { AuthType, OAuthRequest } from "../auth";
import type { KeygenEd25519OutputWithPublicKey } from "./keygen_ed25519";

export interface KeygenRequest {
  auth_type: AuthType;
  user_identifier: string;
  keygen_2: KeygenOutput;
  email?: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export type KeygenBody = {
  keygen_2: KeygenOutput;
};

export type KeygenRequestBody = OAuthRequest<KeygenBody>;

// V2: Combined keygen for both secp256k1 and ed25519
export interface KeygenRequestV2 {
  auth_type: AuthType;
  user_identifier: string;
  keygen_2_secp256k1: KeygenOutput;
  keygen_2_ed25519: KeygenEd25519OutputWithPublicKey;
  email?: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export type KeygenBodyV2 = {
  keygen_2_secp256k1: KeygenOutput;
  keygen_2_ed25519: KeygenEd25519OutputWithPublicKey;
};

export type KeygenRequestBodyV2 = OAuthRequest<KeygenBodyV2>;
