import type { Bytes32, Bytes33 } from "@oko-wallet/bytes";
import type { CheckKeyShareResponse } from "@oko-wallet/ksn-interface/key_share";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { CurveType } from "@oko-wallet/oko-types/crypto";

// @TODO: remove after ksn_interface is updated
export interface CheckKeyShareV2Response {
  secp256k1?: { exists: boolean };
  ed25519?: { exists: boolean };
}

export async function requestCheckKeyShare(
  ksNodeURI: string,
  userEmail: string,
  publicKey: Bytes32 | Bytes33,
  auth_type: AuthType,
  curve_type: CurveType,
) {
  const res = await fetch(`${ksNodeURI}/keyshare/v1/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_auth_id: userEmail,
      auth_type,
      curve_type,
      public_key: publicKey.toHex(),
    }),
  });
  return (await res.json()) as OkoApiResponse<CheckKeyShareResponse>;
}

export async function requestCheckKeyShareV2(
  ksNodeURI: string,
  userEmail: string,
  auth_type: AuthType,
  wallets: {
    secp256k1?: Bytes33;
    ed25519?: Bytes32;
  },
) {
  const walletsPayload: { secp256k1?: string; ed25519?: string } = {};
  if (wallets.secp256k1) {
    walletsPayload.secp256k1 = wallets.secp256k1.toHex();
  }
  if (wallets.ed25519) {
    walletsPayload.ed25519 = wallets.ed25519.toHex();
  }

  const res = await fetch(`${ksNodeURI}/keyshare/v2/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_auth_id: userEmail,
      auth_type,
      wallets: walletsPayload,
    }),
  });
  return (await res.json()) as OkoApiResponse<CheckKeyShareV2Response>;
}
