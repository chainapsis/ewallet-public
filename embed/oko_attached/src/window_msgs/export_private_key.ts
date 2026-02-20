import bs58 from "bs58";

import type { MsgEventContext } from "./types";
import { OKO_SDK_TARGET } from "./target";
import { useAppState } from "@oko-wallet-attached/store/app";
import {
  OKO_API_ENDPOINT,
  USER_DASHBOARD_ORIGINS,
} from "@oko-wallet-attached/requests/endpoints";

// NOTE: This handler is user_dashboard-only (not exposed via SDK).
// Types are defined locally, following the __get_connected_apps__ pattern.

type ExportPrivateKeyError =
  | { type: "UNAUTHORIZED_ORIGIN" }
  | { type: "NOT_AUTHENTICATED" }
  | { type: "MISSING_KEYSHARE" }
  | { type: "COMBINE_ERROR"; error: string }
  | { type: "API_ERROR"; error: string };

type ExportPrivateKeyAckPayload =
  | { success: true; data: { secp256k1: string; ed25519: string } }
  | { success: false; error: ExportPrivateKeyError };

interface OkoWalletMsgExportPrivateKeyAck {
  target: "oko_sdk";
  msg_type: "__export_private_key_ack__";
  payload: ExportPrivateKeyAckPayload;
}

export async function handleExportPrivateKey(
  ctx: MsgEventContext,
): Promise<void> {
  const { port, hostOrigin } = ctx;

  // 1. Origin validation
  const allowedOrigins = USER_DASHBOARD_ORIGINS.split(",").map((o: string) =>
    o.trim(),
  );
  if (!allowedOrigins.includes(hostOrigin)) {
    const ack: OkoWalletMsgExportPrivateKeyAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__export_private_key_ack__",
      payload: { success: false, error: { type: "UNAUTHORIZED_ORIGIN" } },
    };
    port.postMessage(ack);
    return;
  }

  // 2. Auth token validation
  const authToken = useAppState.getState().getAuthToken(hostOrigin);
  if (!authToken) {
    const ack: OkoWalletMsgExportPrivateKeyAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__export_private_key_ack__",
      payload: { success: false, error: { type: "NOT_AUTHENTICATED" } },
    };
    port.postMessage(ack);
    return;
  }

  // 3. Extract user shares from local state
  const keyshare1 = useAppState.getState().getKeyshare_1(hostOrigin);
  const keyPackageEd25519Hex = useAppState
    .getState()
    .getKeyPackageEd25519(hostOrigin);

  if (!keyshare1 || !keyPackageEd25519Hex) {
    const ack: OkoWalletMsgExportPrivateKeyAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__export_private_key_ack__",
      payload: { success: false, error: { type: "MISSING_KEYSHARE" } },
    };
    port.postMessage(ack);
    return;
  }

  // 4. Get ed25519 public key for the response
  const ed25519Wallet = useAppState.getState().getWalletEd25519(hostOrigin);
  const ed25519PublicKey = ed25519Wallet?.publicKey ?? null;

  // -------------------------------------------------------------------
  // TODO: Replace mock with actual implementation when oko_api is ready.
  //
  // Actual flow:
  //
  // (a) Fetch server shares from oko_api
  //
  // const serverSharesRes = await fetch(
  //   `${OKO_API_ENDPOINT}/user_dashboard/v1/export_private_key`,
  //   {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${authToken}`,
  //     },
  //   },
  // );
  // const serverShares = await serverSharesRes.json();
  // // serverShares = { secp256k1: string (keyshare_0 hex), ed25519: string (server signing_share hex) }
  //
  // (b) Combine secp256k1 shares
  //
  // import * as wasmModule from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";
  //
  // const keyCombineInput = {
  //   shares: {
  //     0: serverShares.secp256k1,  // server's share (Participant 0)
  //     1: keyshare1,               // user's share (Participant 1)
  //   },
  // };
  // const fullSecp256k1Key = wasmModule.cli_combine_shares(keyCombineInput);
  // // fullSecp256k1Key is a secp256k1 Scalar → convert to hex
  //
  // (c) Combine ed25519 shares
  //
  // Parse keyPackageEd25519Hex to get user's signing_share.
  // const keyPackageRaw = JSON.parse(
  //   Buffer.from(keyPackageEd25519Hex, "hex").toString("utf-8"),
  // );
  // const userSigningShare = keyPackageRaw.signing_share; // number[]
  //
  // Combine user's signing_share + server's signing_share using FROST sss_combine
  // to recover the full ed25519 signing secret.
  //
  // const fullEd25519Secret = ... // 32 bytes
  // const fullEd25519Keypair = Uint8Array.from([...fullEd25519Secret, ...ed25519PublicKeyBytes]) // 64 bytes
  // const fullEd25519Key = bs58.encode(fullEd25519Keypair) // base58 (Phantom/Solflare import format)
  //
  // -------------------------------------------------------------------

  // [Mock] Return deterministic test keys for development
  const mockSecp256k1 =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const mockEd25519SigningSecret = "a".repeat(64); // 32 bytes hex
  const mockEd25519PublicKey = ed25519PublicKey ?? "b".repeat(64); // 32 bytes hex
  const mockEd25519Hex = mockEd25519SigningSecret + mockEd25519PublicKey;

  // Convert 64-byte ed25519 keypair (secret + pubkey) from hex to base58
  // This is the standard format used by Phantom, Solflare, etc.
  const ed25519Bytes = new Uint8Array(
    (mockEd25519Hex.match(/.{2}/g) ?? []).map((b) => Number.parseInt(b, 16)),
  );
  const mockEd25519Base58 = bs58.encode(ed25519Bytes);

  const ack: OkoWalletMsgExportPrivateKeyAck = {
    target: OKO_SDK_TARGET,
    msg_type: "__export_private_key_ack__",
    payload: {
      success: true,
      data: {
        secp256k1: mockSecp256k1,
        ed25519: mockEd25519Base58,
      },
    },
  };
  port.postMessage(ack);
}
