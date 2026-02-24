import bs58 from "bs58";

import type { AuthType } from "@oko-wallet/oko-types/auth";
import type {
  ExportSharesRequest,
  ExportSharesResponse,
} from "@oko-wallet/oko-types/user";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import * as secp256k1Wasm from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";
import { Bytes } from "@oko-wallet/bytes";
import type { PublicKeyPackageRaw } from "@oko-wallet/oko-types/teddsa";

import type { MsgEventContext } from "./types";
import { OKO_SDK_TARGET } from "./target";
import { useAppState } from "@oko-wallet-attached/store/app";
import { USER_DASHBOARD_ORIGINS } from "@oko-wallet-attached/requests/endpoints";
import { TSS_V2_ENDPOINT } from "@oko-wallet-attached/requests/oko_api";
import { requestKeySharesWithBackup } from "@oko-wallet-attached/requests/ks_node_v2";
import {
  commitAll,
  createOkoApiCommitRevealParams,
  type KsnCommitTarget,
} from "@oko-wallet-attached/crypto/commit_reveal";
import { decodeSecp256k1SharesByNode } from "@oko-wallet-attached/crypto/key_share_utils";
import { combineUserShares } from "@oko-wallet-attached/crypto/combine";
import {
  convertSeedShares,
  reshareUserKeySharesV2,
} from "@oko-wallet-attached/crypto/reshare_v2";
import {
  SEED_ID_CLIENT,
  hexToSeedSharePoint,
  hexToUint8Array,
} from "@oko-wallet-attached/crypto/keygen_ed25519";
import { getServerFrostIdentifier } from "@oko-wallet-attached/crypto/sss_ed25519";

import { setReAuthResolver } from "./export_reauth_state";
import { checkUserExistsV2 } from "./oauth_info_pass/handlers/check_user";

type ExportPrivateKeyError =
  | { type: "UNAUTHORIZED_ORIGIN" }
  | { type: "NOT_AUTHENTICATED" }
  | { type: "USER_NOT_FOUND" }
  | { type: "ED25519_KEYGEN_REQUIRED" }
  | { type: "NODES_BELOW_THRESHOLD" }
  | { type: "RESHARE_REQUIRED" }
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

/**
 * Extract server verifying share from hex-encoded PublicKeyPackageRaw.
 * verifying_shares layout: [0]=client, [1]=server.
 */
function extractServerVerifyingShare(publicKeyPackageHex: string) {
  try {
    const serverIdRes = getServerFrostIdentifier();
    if (!serverIdRes.success) {
      return {
        success: false as const,
        err: `server identifier: ${serverIdRes.err}`,
      };
    }
    const serverIdentifierHex = serverIdRes.data.toHex();

    const jsonStr = new TextDecoder().decode(
      hexToUint8Array(publicKeyPackageHex),
    );
    const pkg: PublicKeyPackageRaw = JSON.parse(jsonStr);
    const serverEntry = pkg.verifying_shares.find(
      (entry) => entry.identifier === serverIdentifierHex,
    );
    if (!serverEntry) {
      return {
        success: false as const,
        err: "server verifying share not found in publicKeyPackage",
      };
    }
    return Bytes.fromUint8Array(Uint8Array.from(serverEntry.share), 32);
  } catch (err) {
    return {
      success: false as const,
      err: `publicKeyPackage parse: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

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
  const firstLoginJwt = useAppState.getState().getAuthToken(hostOrigin);
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

  // 4. Get public keys from appState (no signInV2 needed)
  const wallet = useAppState.getState().getWallet(hostOrigin);
  const ed25519Wallet = useAppState.getState().getWalletEd25519(hostOrigin);
  if (!wallet?.publicKey || !ed25519Wallet?.publicKey) {
    sendAck({
      success: false,
      error: {
        type: "API_ERROR",
        error: "Wallet public keys not found in appState",
      },
    });
    return;
  }
  const secp256k1PubKey = wallet.publicKey;
  const ed25519PubKey = ed25519Wallet.publicKey;

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

  console.log(`${LOG_PREFIX} re-auth credentials received, starting export`);

  // 5a. Notify parent (UD) that re-auth completed — popup close is now expected
  window.parent.postMessage(
    { target: "oko_user_dashboard", msg_type: "__export_reauth_received__" },
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

    // Guard: active nodes below threshold
    if (checkData.active_nodes_below_threshold) {
      sendAck({
        success: false,
        error: { type: "NODES_BELOW_THRESHOLD" },
      });
      return;
    }

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

    // Handle reshare if needed (KSN node changes since last sign-in)
    if ("needs_reshare" in checkData && checkData.needs_reshare) {
      console.log(
        `${LOG_PREFIX} needs_reshare detected, performing reshare before export`,
      );

      // Extract server verifying share from appState publicKeyPackage
      const serverVerifyingShareRes = extractServerVerifyingShare(
        ed25519Wallet.publicKeyPackage,
      );
      if (!serverVerifyingShareRes.success) {
        sendAck({
          success: false,
          error: {
            type: "COMBINE_ERROR",
            error: `server verifying share: ${serverVerifyingShareRes.err}`,
          },
        });
        return;
      }

      // Parse public keys as Bytes for reshare
      const secp256k1PubKeyBytes = Bytes.fromHexString(secp256k1PubKey, 33);
      if (!secp256k1PubKeyBytes.success) {
        sendAck({
          success: false,
          error: {
            type: "COMBINE_ERROR",
            error: `secp256k1 pubkey parse: ${secp256k1PubKeyBytes.err}`,
          },
        });
        return;
      }
      const ed25519PubKeyBytes = Bytes.fromHexString(ed25519PubKey, 32);
      if (!ed25519PubKeyBytes.success) {
        sendAck({
          success: false,
          error: {
            type: "COMBINE_ERROR",
            error: `ed25519 pubkey parse: ${ed25519PubKeyBytes.err}`,
          },
        });
        return;
      }

      // Reshare session: commit ALL nodes with "export_with_reshare"
      // (separate session from the subsequent export — KSN final API = "reshare")
      const reshareKsnTargets: KsnCommitTarget[] = nodes.map((node) => ({
        nodeUrl: node.endpoint,
        operationType: "export_with_reshare" as const,
      }));
      const reshareCommitRes = await commitAll(
        "export_with_reshare",
        creds.authType,
        creds.idToken,
        reshareKsnTargets,
        nodes.length, // ALL nodes must commit for reshare
      );
      if (!reshareCommitRes.success) {
        sendAck({
          success: false,
          error: {
            type: "API_ERROR",
            error: `reshare commit failed: ${reshareCommitRes.err}`,
          },
        });
        return;
      }

      // Perform reshare (get existing shares → expand → send to all nodes)
      const reshareRes = await reshareUserKeySharesV2(
        creds.idToken,
        creds.authType,
        keyshare_node_meta,
        { publicKey: secp256k1PubKeyBytes.data },
        {
          publicKey: ed25519PubKeyBytes.data,
          serverVerifyingShare: serverVerifyingShareRes.data,
        },
        reshareCommitRes.data.session,
      );
      if (!reshareRes.success) {
        sendAck({
          success: false,
          error: {
            type: "API_ERROR",
            error: `reshare failed: ${reshareRes.err}`,
          },
        });
        return;
      }

      console.log(`${LOG_PREFIX} reshare complete, proceeding to export`);
      // Fall through to normal export flow below
    }

    // 7. Commit to KSN nodes + oko_api with "export" operation type
    const ksnCommitTargets: KsnCommitTarget[] = nodes.map((node) => ({
      nodeUrl: node.endpoint,
      operationType: "export" as const,
    }));
    const commitRes = await commitAll(
      "export",
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

    // 8. Request key shares from KSN (using appState public keys)
    const requestSharesRes = await requestKeySharesWithBackup({
      idToken: creds.idToken,
      authType: creds.authType,
      wallets: {
        secp256k1: secp256k1PubKey,
        ed25519: ed25519PubKey,
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

    // 9. Export API: get server shares
    //    Authorization header = re-auth id_token (for commit-reveal middleware)
    //    Body = first_login_jwt + auth_type + commit-reveal params
    const exportCrParamsRes = createOkoApiCommitRevealParams(
      session,
      "export_shares",
    );
    if (!exportCrParamsRes.success) {
      sendAck({
        success: false,
        error: {
          type: "API_ERROR",
          error: `commit-reveal params failed: ${exportCrParamsRes.err}`,
        },
      });
      return;
    }

    const exportApiUrl = `${TSS_V2_ENDPOINT}/export_shares`;
    const exportBody: ExportSharesRequest = {
      first_login_jwt: firstLoginJwt,
      auth_type: creds.authType,
      cr_session_id: exportCrParamsRes.data.cr_session_id,
      cr_signature: exportCrParamsRes.data.cr_signature,
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

    // ---------------------------------------------------------------
    // 10. secp256k1 combine
    // ---------------------------------------------------------------

    // 10a. Decode KSN secp256k1 shares → Point256 format
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

    // 10b. Combine KSN shares → user's keyshare_1 (Lagrange interpolation)
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

    // 10c. Combine user share (Participant 0) + server share (Participant 1) → full private key
    const fullSecp256k1Scalar = secp256k1Wasm.cli_combine_shares({
      shares: {
        "0": userKeyshare1Res.data,
        "1": serverShares.secp256k1_share,
      },
    });
    const secp256k1PrivateKey = `0x${fullSecp256k1Scalar}`;

    // ---------------------------------------------------------------
    // 11. ed25519 seed 2-stage combine
    // ---------------------------------------------------------------

    // 11a. Convert KSN seed shares to UserKeySharePointByNode format
    const ksnSeedShares = convertSeedShares(keySharesByNode);

    // 11b. Convert to PointNumArr for WASM
    const ksnSeedPoints = ksnSeedShares.map((s) => ({
      x: [...s.share.x.toUint8Array()],
      y: [...s.share.y.toUint8Array()],
    }));

    // 11c. Stage 1: Combine KSN seed shares → user_seed_Y
    const userSeedY: number[] = secp256k1Wasm.seed_sss_combine(
      ksnSeedPoints,
      threshold,
    );

    // 11d. Parse server's seed share
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

    // 11e. Stage 2: Combine server share + reconstructed user share → original seed
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

    // 11f. Build ed25519 keypair: seed[32] || pubkey[32] → bs58
    const seedBytes = Uint8Array.from(recoveredSeed);
    const pubkeyBytes = hexToUint8Array(ed25519PubKey);
    const keypairBytes = new Uint8Array(seedBytes.length + pubkeyBytes.length);
    keypairBytes.set(seedBytes, 0);
    keypairBytes.set(pubkeyBytes, seedBytes.length);
    const ed25519Keypair = bs58.encode(keypairBytes);

    // 12. Return result
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
