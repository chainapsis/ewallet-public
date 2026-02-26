import * as secp256k1Wasm from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";
import type {
  ExportPrivateKeyAckPayload,
  OkoWalletMsgExportPrivateKeyAck,
} from "@oko-wallet/oko-sdk-core";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type {
  ExportSharesRequest,
  ExportSharesResponse,
} from "@oko-wallet/oko-types/user";
import bs58 from "bs58";

import {
  type ReAuthCredentials,
  setReAuthResolver,
} from "./export_reauth_state";
import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import {
  hexToSeedSharePoint,
  hexToUint8Array,
  SEED_ID_CLIENT,
} from "@oko-wallet-attached/crypto/keygen_ed25519";
import { USER_DASHBOARD_ORIGINS } from "@oko-wallet-attached/requests/endpoints";
import { TSS_V2_ENDPOINT } from "@oko-wallet-attached/requests/oko_api";
import { useAppState } from "@oko-wallet-attached/store/app";

const REAUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const LOG_PREFIX = "[attached][export]";

export async function handleExportPrivateKey(
  ctx: MsgEventContext,
  payload?: { auth_type: AuthType } | null,
): Promise<void> {
  const { port, hostOrigin } = ctx;

  function sendAck(ackPayload: ExportPrivateKeyAckPayload) {
    const ack: OkoWalletMsgExportPrivateKeyAck = {
      target: OKO_SDK_TARGET,
      msg_type: "__export_private_key_ack__",
      payload: ackPayload,
    };
    port.postMessage(ack);
  }

  // 1. Origin validation
  const allowedOrigins = USER_DASHBOARD_ORIGINS.split(",").map((o: string) =>
    o.trim(),
  );
  if (!allowedOrigins.includes(hostOrigin)) {
    sendAck({ success: false, error: { type: "UNAUTHORIZED_ORIGIN" } });
    return;
  }

  // 2. Auth token validation (first login JWT — will be sent to export_shares as body param)
  const appState = useAppState.getState();
  const firstLoginJwt = appState.getAuthToken(hostOrigin);
  if (!firstLoginJwt) {
    sendAck({ success: false, error: { type: "NOT_AUTHENTICATED" } });
    return;
  }

  // 3. Payload validation
  if (!payload?.auth_type) {
    sendAck({
      success: false,
      error: { type: "API_ERROR", error: "Missing payload (auth_type)" },
    });
    return;
  }

  // 4. Get client shares from appState (stored during sign-in/keygen)
  const keyshare1 = appState.getKeyshare_1(hostOrigin);
  const seedEd25519Str = appState.getSeedEd25519(hostOrigin);
  const ed25519Wallet = appState.getWalletEd25519(hostOrigin);
  if (!keyshare1 || !seedEd25519Str || !ed25519Wallet?.publicKey) {
    sendAck({ success: false, error: { type: "MISSING_KEY_SHARES" } });
    return;
  }
  const seedEd25519: number[] = JSON.parse(seedEd25519Str);
  const ed25519PubKey = ed25519Wallet.publicKey;

  // 5. Wait for re-auth credentials (popup → OAuth callback → interceptor)
  let creds: ReAuthCredentials;
  try {
    const reAuthPromise = setReAuthResolver();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("REAUTH_TIMEOUT")), REAUTH_TIMEOUT_MS);
    });
    creds = await Promise.race([reAuthPromise, timeoutPromise]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "REAUTH_TIMEOUT") {
      sendAck({ success: false, error: { type: "REAUTH_TIMEOUT" } });
    } else {
      sendAck({
        success: false,
        error: { type: "REAUTH_ERROR", error: message },
      });
    }
    return;
  }

  console.log(`${LOG_PREFIX} re-auth credentials received, starting export`);

  // 5a. Notify parent (UD) that re-auth completed — popup close is now expected
  window.parent.postMessage(
    { target: "oko_user_dashboard", msg_type: "__export_reauth_received__" },
    hostOrigin,
  );

  try {
    // 6. Export API: get server shares (no commit-reveal)
    const exportApiUrl = `${TSS_V2_ENDPOINT}/export_shares`;
    const exportBody: ExportSharesRequest = {
      first_login_jwt: firstLoginJwt,
      auth_type: creds.authType,
    };
    const exportRes = await fetch(exportApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.idToken}`,
      },
      body: JSON.stringify(exportBody),
    });
    if (!exportRes.ok) {
      sendAck({
        success: false,
        error: {
          type: "API_ERROR",
          error: `export API failed with status ${exportRes.status}`,
        },
      });
      return;
    }
    const exportJson: OkoApiResponse<ExportSharesResponse> =
      await exportRes.json();
    if (!exportJson.success) {
      sendAck({
        success: false,
        error: {
          type: "API_ERROR",
          error: `export API error: ${exportJson.msg}`,
        },
      });
      return;
    }
    const serverShares = exportJson.data;

    // 7. secp256k1: combine user share (appState) + server share → full private key
    const fullSecp256k1Scalar = secp256k1Wasm.cli_combine_shares({
      shares: {
        "0": keyshare1,
        "1": serverShares.secp256k1_share,
      },
    });
    const secp256k1PrivateKey = `0x${fullSecp256k1Scalar}`;

    // 8. ed25519: combine user seed (appState) + server seed share → original seed
    const serverSeedShareRes = hexToSeedSharePoint(
      serverShares.ed25519_seed_share,
    );
    if (!serverSeedShareRes.success) {
      sendAck({
        success: false,
        error: {
          type: "COMBINE_ERROR",
          error: `server seed share parse: ${serverSeedShareRes.err}`,
        },
      });
      return;
    }

    const serverSeedPoint = {
      x: [...serverSeedShareRes.data.x.toUint8Array()],
      y: [...serverSeedShareRes.data.y.toUint8Array()],
    };
    const userSeedPoint = {
      x: SEED_ID_CLIENT,
      y: seedEd25519,
    };
    const recoveredSeed: number[] = secp256k1Wasm.seed_sss_combine(
      [serverSeedPoint, userSeedPoint],
      2,
    );

    // 8a. Build ed25519 keypair: seed[32] || pubkey[32] → bs58
    const seedBytes = Uint8Array.from(recoveredSeed);
    const pubkeyBytes = hexToUint8Array(ed25519PubKey);
    const keypairBytes = new Uint8Array(seedBytes.length + pubkeyBytes.length);
    keypairBytes.set(seedBytes, 0);
    keypairBytes.set(pubkeyBytes, seedBytes.length);
    const ed25519Keypair = bs58.encode(keypairBytes);

    // 9. Return result
    console.log(`${LOG_PREFIX} export complete`);
    sendAck({
      success: true,
      data: {
        secp256k1: secp256k1PrivateKey,
        ed25519: ed25519Keypair,
      },
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} unexpected error`, err);
    sendAck({
      success: false,
      error: {
        type: "COMBINE_ERROR",
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
