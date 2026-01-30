import type { AuthType, OAuthRequest } from "../auth";

// NOTE: This matches NAPI addon's KeygenOutput structure (serialized bytes)
export interface KeygenEd25519Output {
  key_package: number[];
  public_key_package: number[];
  identifier: number[];
}

export interface KeygenEd25519OutputWithPublicKey extends KeygenEd25519Output {
  public_key: number[];
}

export interface KeygenEd25519Request {
  auth_type: AuthType;
  user_identifier: string;
  keygen_2: KeygenEd25519OutputWithPublicKey;
  email?: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export type KeygenEd25519Body = {
  keygen_2: KeygenEd25519OutputWithPublicKey;
};

export type KeygenEd25519RequestBody = OAuthRequest<KeygenEd25519Body>;
