import bs58 from "bs58";

import type { AuthType } from "@oko-wallet/oko-types/auth";
import type {
  ExportSharesRequest,
  ExportSharesResponse,
} from "@oko-wallet/oko-types/user";
import * as secp256k1Wasm from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";

import type { MsgEventContext } from "./types";
import { OKO_SDK_TARGET } from "./target";
import { useAppState } from "@oko-wallet-attached/store/app";
import { USER_DASHBOARD_ORIGINS } from "@oko-wallet-attached/requests/endpoints";
import {
  signInV2,
  TSS_V2_ENDPOINT,
} from "@oko-wallet-attached/requests/oko_api";
import { requestKeySharesWithBackup } from "@oko-wallet-attached/requests/ks_node_v2";
import {
  commitAll,
  createOkoApiCommitRevealParams,
  type KsnCommitTarget,
} from "@oko-wallet-attached/crypto/commit_reveal";
import { decodeSecp256k1SharesByNode } from "@oko-wallet-attached/crypto/key_share_utils";
import { combineUserShares } from "@oko-wallet-attached/crypto/combine";
import { convertSeedShares } from "@oko-wallet-attached/crypto/reshare_v2";
import {
  SEED_ID_CLIENT,
  hexToSeedSharePoint,
  hexToUint8Array,
} from "@oko-wallet-attached/crypto/keygen_ed25519";

import { setReAuthResolver } from "./export_reauth_state";
import { checkUserExistsV2 } from "./oauth_info_pass/handlers/check_user";

type ExportPrivateKeyError =
  | { type: "UNAUTHORIZED_ORIGIN" }
  | { type: "NOT_AUTHENTICATED" }
  | { type: "USER_NOT_FOUND" }
  | { type: "ED25519_KEYGEN_REQUIRED" }
  | { type: "USER_MISMATCH" }
  | { type: "COMBINE_ERROR"; error: string }
  | { type: "API_ERROR"; error: string }
  | { type: "REAUTH_TIMEOUT" }
  | { type: "REAUTH_ERROR"; error: string };

type ExportPrivateKeyAckPayload =
  | { success: true; data: { secp256k1: string; ed25519: string } }
  | { success: false; error: ExportPrivateKeyError };

interface OkoWalletMsgExportPrivateKeyAck {
  target: "oko_sdk";
  msg_type: "__export_private_key_ack__";
  payload: ExportPrivateKeyAckPayload;
}

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

  // 2. Auth token validation
  const authToken = useAppState.getState().getAuthToken(hostOrigin);
  if (!authToken) {
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

  // 4. Capture first login context from appState
  const wallet = useAppState.getState().getWallet(hostOrigin);
  const firstLoginPublicKey = wallet?.publicKey ?? null;
  const apiKey = useAppState.getState().getApiKey(hostOrigin) ?? undefined;

  // 5. Wait for re-auth credentials (popup → OAuth callback → interceptor)
  let creds;
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

  console.log(`${LOG_PREFIX} re-auth credentials received, starting sign-in`);

  // 5a. Notify parent (UD) that re-auth completed — popup close is now expected
  window.parent.postMessage(
    { target: "oko_sdk", msg_type: "__export_reauth_received__" },
    hostOrigin,
  );

  try {
    // 6. Check user exists
    const checkRes = await checkUserExistsV2(
      creds.userIdentifier,
      creds.authType,
    );
    if (!checkRes.success) {
      sendAck({
        success: false,
        error: { type: "API_ERROR", error: "Failed to check user" },
      });
      return;
    }
    if (!checkRes.data.success) {
      sendAck({
        success: false,
        error: { type: "API_ERROR", error: checkRes.data.msg },
      });
      return;
    }

    const checkData = checkRes.data.data;

    // Guard: user not found
    if (!checkData.exists) {
      sendAck({ success: false, error: { type: "USER_NOT_FOUND" } });
      return;
    }

    // Guard: needs ed25519 keygen (can't export both keys)
    if ("needs_keygen_ed25519" in checkData && checkData.needs_keygen_ed25519) {
      sendAck({ success: false, error: { type: "ED25519_KEYGEN_REQUIRED" } });
      return;
    }

    const { keyshare_node_meta } = checkData;
    const { threshold, nodes } = keyshare_node_meta;

    // 7. Sign-in building blocks: commitAll → signInV2
    const ksnCommitTargets: KsnCommitTarget[] = nodes.map((node) => ({
      nodeUrl: node.endpoint,
      operationType: "sign_in" as const,
    }));
    const commitRes = await commitAll(
      "sign_in",
      creds.authType,
      creds.idToken,
      ksnCommitTargets,
      threshold,
    );
    if (!commitRes.success) {
      sendAck({
        success: false,
        error: { type: "API_ERROR", error: `commit failed: ${commitRes.err}` },
      });
      return;
    }
    const { session, readyNodes, pendingCommits } = commitRes.data;

    const signInCommitRevealRes = createOkoApiCommitRevealParams(
      session,
      "signin",
    );
    if (!signInCommitRevealRes.success) {
      sendAck({
        success: false,
        error: {
          type: "API_ERROR",
          error: `commit-reveal params failed: ${signInCommitRevealRes.err}`,
        },
      });
      return;
    }

    const signInResult = await signInV2(
      creds.idToken,
      creds.authType,
      signInCommitRevealRes.data,
      apiKey,
    );
    if (!signInResult.success) {
      sendAck({
        success: false,
        error: {
          type: "API_ERROR",
          error: `signIn failed: ${signInResult.err.error}`,
        },
      });
      return;
    }
    const signInResp = signInResult.data;

    // 8. User mismatch check (re-auth must match first login)
    if (
      firstLoginPublicKey &&
      signInResp.user.public_key_secp256k1 !== firstLoginPublicKey
    ) {
      sendAck({ success: false, error: { type: "USER_MISMATCH" } });
      return;
    }

    // 9. Request key shares from KSN
    const requestSharesRes = await requestKeySharesWithBackup({
      idToken: creds.idToken,
      authType: creds.authType,
      wallets: {
        secp256k1: signInResp.user.public_key_secp256k1,
        ed25519: signInResp.user.public_key_ed25519,
      },
      threshold,
      session,
      readyNodes,
      pendingCommits,
      allNodes: nodes,
    });
    if (!requestSharesRes.success) {
      sendAck({
        success: false,
        error: {
          type: "API_ERROR",
          error: `insufficient shares: got ${requestSharesRes.err.got}/${requestSharesRes.err.need}`,
        },
      });
      return;
    }
    const { shares: keySharesByNode } = requestSharesRes.data;

    // 10. Export API: get server shares (dual-auth: JWT + re-auth id_token)
    const exportApiUrl = `${TSS_V2_ENDPOINT}/export_shares`;
    const exportBody: ExportSharesRequest = {
      auth_type: creds.authType,
      id_token: creds.idToken,
    };
    const exportRes = await fetch(exportApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(exportBody),
    });
    if (!exportRes.ok) {
      const errText = await exportRes.text().catch(() => "");
      sendAck({
        success: false,
        error: {
          type: "API_ERROR",
          error: `export API ${exportRes.status}: ${errText}`,
        },
      });
      return;
    }
    const serverShares: ExportSharesResponse = await exportRes.json();

    // ---------------------------------------------------------------
    // 11. secp256k1 combine
    // ---------------------------------------------------------------

    // 11a. Decode KSN secp256k1 shares → Point256 format
    const secp256k1DecodeRes =
      await decodeSecp256k1SharesByNode(keySharesByNode);
    if (!secp256k1DecodeRes.success) {
      sendAck({
        success: false,
        error: {
          type: "COMBINE_ERROR",
          error: `secp256k1 decode: ${secp256k1DecodeRes.err.error}`,
        },
      });
      return;
    }

    // 11b. Combine KSN shares → user's keyshare_1 (Lagrange interpolation)
    const userKeyshare1Res = await combineUserShares(
      secp256k1DecodeRes.data,
      threshold,
    );
    if (!userKeyshare1Res.success) {
      sendAck({
        success: false,
        error: {
          type: "COMBINE_ERROR",
          error: `secp256k1 user combine: ${userKeyshare1Res.err}`,
        },
      });
      return;
    }

    // 11c. Combine server share (Participant 0) + user share (Participant 1) → full private key
    const fullSecp256k1Scalar = secp256k1Wasm.cli_combine_shares({
      shares: {
        "0": serverShares.secp256k1_share,
        "1": userKeyshare1Res.data,
      },
    });
    const secp256k1PrivateKey = `0x${fullSecp256k1Scalar}`;

    // ---------------------------------------------------------------
    // 12. ed25519 seed 2-stage combine
    // ---------------------------------------------------------------

    // 12a. Convert KSN seed shares to UserKeySharePointByNode format
    const ksnSeedShares = convertSeedShares(keySharesByNode);

    // 12b. Convert to PointNumArr for WASM
    const ksnSeedPoints = ksnSeedShares.map((s) => ({
      x: [...s.share.x.toUint8Array()],
      y: [...s.share.y.toUint8Array()],
    }));

    // 12c. Stage 1: Combine KSN seed shares → user_seed_Y
    const userSeedY: number[] = secp256k1Wasm.seed_sss_combine(
      ksnSeedPoints,
      threshold,
    );

    // 12d. Parse server's seed share
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

    // 12e. Stage 2: Combine server share + reconstructed user share → original seed
    const serverSeedPoint = {
      x: [...serverSeedShareRes.data.x.toUint8Array()],
      y: [...serverSeedShareRes.data.y.toUint8Array()],
    };
    const userSeedPoint = {
      x: SEED_ID_CLIENT,
      y: userSeedY,
    };
    const recoveredSeed: number[] = secp256k1Wasm.seed_sss_combine(
      [serverSeedPoint, userSeedPoint],
      2,
    );

    // 12f. Build ed25519 keypair: seed[32] || pubkey[32] → bs58
    const seedBytes = Uint8Array.from(recoveredSeed);
    const pubkeyBytes = hexToUint8Array(signInResp.user.public_key_ed25519);
    const keypairBytes = new Uint8Array(seedBytes.length + pubkeyBytes.length);
    keypairBytes.set(seedBytes, 0);
    keypairBytes.set(pubkeyBytes, seedBytes.length);
    const ed25519Keypair = bs58.encode(keypairBytes);

    // 13. Return result
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
