import type { AuthType } from "@oko-wallet/oko-types/auth";

export interface MsgEventContext {
  port: MessagePort;
  hostOrigin: string;
}

export interface GoogleTokenInfo {
  alg: string;
  at_hash: string;
  aud: string;
  azp: string;
  email: string;
  email_verified: string;
  exp: string;
  family_name: string;
  given_name: string;
  hd: string;
  iat: string;
  iss: string;
  jti: string;
  kid: string;
  name: string;
  nbf: string;
  nonce: string;
  picture: string;
  sub: string;
  typ: string;
}

export interface XUserInfo {
  id: string;
  name: string;
  username: string;
  email?: string;
}

export interface DiscordUserInfo {
  id: string;
  username: string;
  discriminator: string;
  email: string;
  verified?: boolean;
  avatar?: string;
  global_name?: string;
}

export interface Auth0TokenInfo {
  email: string;
  email_verified: boolean;
  nonce: string;
  name: string;
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
}

export interface TokenInfo {
  provider: AuthType;
  user_identifier: string;
}

export interface UserSignInResult {
  publicKey: string;
  walletId: string;
  jwtToken: string;
  keyshare_1: string;
  isNewUser: boolean;
  name: string | null;
  email: string | null;
}

export interface UserSignInResultV2 {
  publicKeySecp256k1: string;
  publicKeyEd25519: string;
  walletIdSecp256k1: string;
  walletIdEd25519: string;
  jwtToken: string;
  /** hex-encoded tss_private_share for secp256k1 */
  keyshare1Secp256k1: string;
  /** hex-encoded KeyPackageRaw JSON for ed25519 (contains signing_share) */
  keyPackageEd25519: string;
  /** hex-encoded PublicKeyPackageRaw JSON for ed25519 */
  publicKeyPackageEd25519: string;
  /** combined ed25519 user seed share as number[] */
  seedEd25519: number[];
  isNewUser: boolean;
  name: string | null;
  email: string | null;
}
