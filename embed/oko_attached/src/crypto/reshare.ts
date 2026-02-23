import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import type {
  NodeNameAndEndpoint,
  PointNumArr,
  RunExpandSharesResult,
  UserKeySharePointByNode,
} from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";
import {
  doSendResharedUserKeyShares,
  doSendUserKeyShares,
  requestSplitShares,
} from "@oko-wallet-attached/requests/ks_node";
import { Bytes, type Bytes33 } from "@oko-wallet/bytes";
import * as wasmModule from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";
import type { ReshareRequestBody } from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { hashKeyshareNodeNames } from "./hash";
import { makeAuthorizedOkoApiRequest } from "@oko-wallet-attached/requests/oko_api";

export async function reshareUserKeyShares(
  publicKey: Bytes33,
  idToken: string,
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
  authType: AuthType,
): Promise<Result<string, string>> {
  const splitKSNodes = keyshareNodeMeta.nodes.filter(
    (n) => n.wallet_status === "ACTIVE",
  );

  const additionalKSNodes = keyshareNodeMeta.nodes.filter(
    (n) =>
      n.wallet_status === "NOT_REGISTERED" ||
      n.wallet_status === "UNRECOVERABLE_DATA_LOSS",
  );

  if (splitKSNodes.length < keyshareNodeMeta.threshold) {
    return {
      success: false,
      err: "insufficient existing KS nodes for reshare",
    };
  }

  const splitKeySharesRes = await requestSplitShares(
    publicKey,
    idToken,
    splitKSNodes,
    keyshareNodeMeta.threshold,
    authType,
  );
  if (!splitKeySharesRes.success) {
    const error = splitKeySharesRes.err;
    return {
      success: false,
      err:
        error.code === "WALLET_NOT_FOUND"
          ? `Failed to request shares for reshare: share lost on node ${error.affectedNode.name}`
          : `Failed to request shares for reshare: got ${error.got}/${error.need} shares`,
    };
  }
  const splitKeySharePoints = splitKeySharesRes.data;

  const runReshareRes = await runExpandShares(
    splitKeySharePoints,
    additionalKSNodes,
    keyshareNodeMeta.threshold,
  );
  if (runReshareRes.success === false) {
    return {
      success: false,
      err: runReshareRes.err,
    };
  }

  // encode reshared key shares to string
  const resharedKeyShares: UserKeySharePointByNode[] =
    runReshareRes.data.reshared_user_key_shares;

  // send reshared key shares to KS nodes with node-specific routing
  const sendKeySharesResult: Result<void, string>[] = await Promise.all(
    resharedKeyShares.map((keyShareByNode) => {
      // Find corresponding node metadata to determine wallet_status
      const nodeMetadata =
        splitKSNodes.find((n) => n.endpoint === keyShareByNode.node.endpoint) ||
        additionalKSNodes.find(
          (n) => n.endpoint === keyShareByNode.node.endpoint,
        );

      // Route based on wallet_status
      const shouldUseRegister =
        nodeMetadata?.wallet_status === "NOT_REGISTERED" ||
        nodeMetadata?.wallet_status === "UNRECOVERABLE_DATA_LOSS";

      if (shouldUseRegister) {
        return doSendUserKeyShares(
          keyShareByNode.node.endpoint,
          idToken,
          publicKey,
          keyShareByNode.share,
          authType,
        );
      } else {
        return doSendResharedUserKeyShares(
          keyShareByNode.node.endpoint,
          idToken,
          publicKey,
          keyShareByNode.share,
          authType,
        );
      }
    }),
  );

  const errResults = sendKeySharesResult.filter(
    (result) => result.success === false,
  );

  if (errResults.length > 0) {
    return {
      success: false,
      err: errResults.map((result) => result.err).join("\n"),
    };
  }

  const updateWalletStatusRes = await makeAuthorizedOkoApiRequest<
    ReshareRequestBody,
    void
  >("user/reshare", idToken, {
    auth_type: authType,
    public_key: publicKey.toHex(),
    reshared_key_shares: resharedKeyShares.map((keyShare) => keyShare.node),
  });

  if (updateWalletStatusRes.success === false) {
    return {
      success: false,
      err: "Failed to update wallet status for reshare",
    };
  }

  return {
    success: true,
    data: runReshareRes.data.original_secret.toHex(),
  };
}

export async function runSeedExpandShares(
  splitKeyShares: UserKeySharePointByNode[],
  additionalKSNodes: NodeNameAndEndpoint[],
  threshold: number,
): Promise<Result<RunExpandSharesResult, string>> {
  try {
    if (threshold < 2) {
      return {
        success: false,
        err: "Threshold must be at least 2",
      };
    }

    if (splitKeyShares.length < threshold) {
      return {
        success: false,
        err: "Number of user key shares is less than threshold",
      };
    }

    const splitPoints: PointNumArr[] = splitKeyShares.map((splitKeyShare) => ({
      x: [...splitKeyShare.share.x.toUint8Array()],
      y: [...splitKeyShare.share.y.toUint8Array()],
    }));

    const additionalKSNodeHashesRes = await hashKeyshareNodeNames(
      additionalKSNodes.map((node) => node.name),
    );
    if (additionalKSNodeHashesRes.success === false) {
      return {
        success: false,
        err: additionalKSNodeHashesRes.err,
      };
    }
    const additionalKSNodeHashes = additionalKSNodeHashesRes.data.map(
      (bytes) => {
        return [...bytes.toUint8Array()];
      },
    );

    const reshareResult: {
      t: number;
      reshared_points: PointNumArr[];
      secret: number[];
    } = await wasmModule.seed_sss_expand_shares(
      splitPoints,
      additionalKSNodeHashes,
      threshold,
    );

    const resharedPoints: UserKeySharePointByNode[] = [];
    for (let i = 0; i < reshareResult.reshared_points.length; ++i) {
      const xBytesRes = Bytes.fromUint8Array(
        Uint8Array.from(reshareResult.reshared_points[i].x),
        32,
      );
      if (xBytesRes.success === false) {
        return {
          success: false,
          err: `Failed to convert reshared key share to bytes: ${xBytesRes.err}`,
        };
      }
      const yBytesRes = Bytes.fromUint8Array(
        Uint8Array.from(reshareResult.reshared_points[i].y),
        32,
      );
      if (yBytesRes.success === false) {
        return {
          success: false,
          err: `Failed to convert reshared key share to bytes: ${yBytesRes.err}`,
        };
      }
      resharedPoints.push({
        node:
          i < splitKeyShares.length
            ? splitKeyShares[i].node
            : {
                name: additionalKSNodes[i - splitKeyShares.length].name,
                endpoint: additionalKSNodes[i - splitKeyShares.length].endpoint,
              },
        share: {
          x: xBytesRes.data,
          y: yBytesRes.data,
        },
      });
    }

    const originalSecretBytesRes = Bytes.fromUint8Array(
      Uint8Array.from(reshareResult.secret),
      32,
    );
    if (originalSecretBytesRes.success === false) {
      return {
        success: false,
        err: `Failed to convert original secret to bytes: ${originalSecretBytesRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        t: reshareResult.t,
        reshared_user_key_shares: resharedPoints,
        original_secret: originalSecretBytesRes.data,
      },
    };
  } catch (e) {
    return {
      success: false,
      err: String(e),
    };
  }
}

export async function runExpandShares(
  splitKeyShares: UserKeySharePointByNode[],
  additionalKSNodes: NodeNameAndEndpoint[],
  threshold: number,
): Promise<Result<RunExpandSharesResult, string>> {
  try {
    if (threshold < 2) {
      return {
        success: false,
        err: "Threshold must be at least 2",
      };
    }

    if (splitKeyShares.length < threshold) {
      return {
        success: false,
        err: "Number of user key shares is less than threshold",
      };
    }

    const splitPoints: PointNumArr[] = splitKeyShares.map((splitKeyShare) => ({
      x: [...splitKeyShare.share.x.toUint8Array()],
      y: [...splitKeyShare.share.y.toUint8Array()],
    }));

    const additionalKSNodeHashesRes = await hashKeyshareNodeNames(
      additionalKSNodes.map((node) => node.name),
    );
    if (additionalKSNodeHashesRes.success === false) {
      return {
        success: false,
        err: additionalKSNodeHashesRes.err,
      };
    }
    const additionalKSNodeHashes = additionalKSNodeHashesRes.data.map(
      (bytes) => {
        return [...bytes.toUint8Array()];
      },
    );

    const reshareResult: {
      t: number;
      reshared_points: PointNumArr[];
      secret: number[];
    } = await wasmModule.sss_expand_shares(
      splitPoints,
      additionalKSNodeHashes,
      threshold,
    );

    const resharedPoints: UserKeySharePointByNode[] = [];
    for (let i = 0; i < reshareResult.reshared_points.length; ++i) {
      const xBytesRes = Bytes.fromUint8Array(
        Uint8Array.from(reshareResult.reshared_points[i].x),
        32,
      );
      if (xBytesRes.success === false) {
        return {
          success: false,
          err: `Failed to convert reshared key share to bytes: ${xBytesRes.err}`,
        };
      }
      const yBytesRes = Bytes.fromUint8Array(
        Uint8Array.from(reshareResult.reshared_points[i].y),
        32,
      );
      if (yBytesRes.success === false) {
        return {
          success: false,
          err: `Failed to convert reshared key share to bytes: ${yBytesRes.err}`,
        };
      }
      resharedPoints.push({
        node:
          i < splitKeyShares.length
            ? splitKeyShares[i].node
            : {
                name: additionalKSNodes[i - splitKeyShares.length].name,
                endpoint: additionalKSNodes[i - splitKeyShares.length].endpoint,
              },
        share: {
          x: xBytesRes.data,
          y: yBytesRes.data,
        },
      });
    }

    const originalSecretBytesRes = Bytes.fromUint8Array(
      Uint8Array.from(reshareResult.secret),
      32,
    );
    if (originalSecretBytesRes.success === false) {
      return {
        success: false,
        err: `Failed to convert original secret to bytes: ${originalSecretBytesRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        t: reshareResult.t,
        reshared_user_key_shares: resharedPoints,
        original_secret: originalSecretBytesRes.data,
      },
    };
  } catch (e) {
    return {
      success: false,
      err: String(e),
    };
  }
}
