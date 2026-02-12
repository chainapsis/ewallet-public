import bs58 from "bs58";
import * as csWasmModule from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";
import { wasmModule as frostWasmModule } from "@oko-wallet/frost-ed25519-keplr-wasm";
import { Bytes } from "@oko-wallet/bytes";
import type { KeyPackageRaw } from "@oko-wallet/oko-types/teddsa";

import type { MsgEventContext } from "./types";
import { OKO_SDK_TARGET } from "./target";
import { useAppState } from "@oko-wallet-attached/store/app";
import {
  OKO_API_ENDPOINT,
  USER_DASHBOARD_ORIGINS,
} from "@oko-wallet-attached/requests/endpoints";
import { computeVerifyingShare } from "@oko-wallet-attached/crypto/scalar";

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

  try {
    // 5. Fetch server shares from oko_api
    const serverSharesRes = await fetch(
      `${OKO_API_ENDPOINT}/user_dashboard/v1/export_private_key`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (!serverSharesRes.ok) {
      const ack: OkoWalletMsgExportPrivateKeyAck = {
        target: OKO_SDK_TARGET,
        msg_type: "__export_private_key_ack__",
        payload: {
          success: false,
          error: {
            type: "API_ERROR",
            error: `HTTP ${serverSharesRes.status}`,
          },
        },
      };
      port.postMessage(ack);
      return;
    }

    const serverSharesJson = (await serverSharesRes.json()) as {
      success: boolean;
      data?: { secp256k1: string; ed25519: string };
      msg?: string;
    };

    if (!serverSharesJson.success || !serverSharesJson.data) {
      const ack: OkoWalletMsgExportPrivateKeyAck = {
        target: OKO_SDK_TARGET,
        msg_type: "__export_private_key_ack__",
        payload: {
          success: false,
          error: {
            type: "API_ERROR",
            error: serverSharesJson.msg ?? "Unknown error",
          },
        },
      };
      port.postMessage(ack);
      return;
    }

    const serverShares = serverSharesJson.data;

    // 6. Combine secp256k1 shares using cli_combine_shares
    // keygen_1 (Participant 0) → user's keyshare_1
    // keygen_2 (Participant 1) → server's enc_tss_share
    const fullSecp256k1Scalar = csWasmModule.cli_combine_shares({
      shares: {
        0: keyshare1, // user's share (Participant 0, from keygen_1)
        1: serverShares.secp256k1, // server's share (Participant 1, from keygen_2)
      },
    }) as string;
    const fullSecp256k1Key = `0x${fullSecp256k1Scalar}`;

    // 7. Combine ed25519 shares using FROST sss_combine
    const hexToBytes = (hex: string): number[] =>
      (hex.match(/.{2}/g) ?? []).map((b) => Number.parseInt(b, 16));

    // Parse user's key package from hex-encoded JSON
    const keyPackageRaw: KeyPackageRaw = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(hexToBytes(keyPackageEd25519Hex)),
      ),
    );

    // Convert server's signing_share hex to Bytes32 for computeVerifyingShare
    const serverSigningShareArr = hexToBytes(serverShares.ed25519);
    const serverSigningShareBytes = Bytes.fromUint8Array(
      new Uint8Array(serverSigningShareArr),
      32,
    );
    if (!serverSigningShareBytes.success) {
      throw new Error(
        `Invalid server signing_share: ${serverSigningShareBytes.err}`,
      );
    }
    const serverVerifyingShare = computeVerifyingShare(
      serverSigningShareBytes.data,
    );

    // Construct server's KeyPackageRaw (server identifier = scalar 2 in LE)
    const serverIdentifier = new Uint8Array(32);
    serverIdentifier[0] = 2;

    const serverKeyPackageRaw: KeyPackageRaw = {
      identifier: [...serverIdentifier],
      signing_share: serverSigningShareArr,
      verifying_share: [...serverVerifyingShare.toUint8Array()],
      verifying_key: keyPackageRaw.verifying_key,
      min_signers: keyPackageRaw.min_signers,
    };

    // Combine both key packages to recover the full ed25519 signing secret
    const combinedSigningSecret: number[] = frostWasmModule.sss_combine([
      keyPackageRaw,
      serverKeyPackageRaw,
    ]);

    // Build 64-byte ed25519 keypair (secret + pubkey) and encode to base58
    const ed25519PubKeyBytes = ed25519PublicKey
      ? hexToBytes(ed25519PublicKey)
      : keyPackageRaw.verifying_key;

    const ed25519Keypair = new Uint8Array([
      ...combinedSigningSecret,
      ...ed25519PubKeyBytes,
    ]);
    const fullEd25519Key = bs58.encode(ed25519Keypair);

    const ack: OkoWalletMsgExportPrivateKeyAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__export_private_key_ack__",
      payload: {
        success: true,
        data: {
          secp256k1: fullSecp256k1Key,
          ed25519: fullEd25519Key,
        },
      },
    };
    port.postMessage(ack);
  } catch (error) {
    const ack: OkoWalletMsgExportPrivateKeyAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__export_private_key_ack__",
      payload: {
        success: false,
        error: {
          type: "COMBINE_ERROR",
          error: error instanceof Error ? error.message : String(error),
        },
      },
    };
    port.postMessage(ack);
  }
}
