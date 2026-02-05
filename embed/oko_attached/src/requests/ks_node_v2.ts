import type {
  GetKeyShareV2Response,
  GetKeyShareV2WithCRRequestBody,
  RegisterKeyShareV2WithCRRequestBody,
  RegisterEd25519V2WithCRRequestBody,
  ReshareKeyShareV2WithCRRequestBody,
  ReshareRegisterV2WithCRRequestBody,
} from "@oko-wallet/ksn-interface/key_share";
import type {
  CommitRequestBody,
  CommitResponseData,
} from "@oko-wallet/ksn-interface/commit_reveal";
import type { OperationType } from "@oko-wallet/ksn-interface/commit_reveal";
import type { NodeStatusInfo } from "@oko-wallet/oko-types/tss";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { CommitRevealParams } from "@oko-wallet/oko-types/commit_reveal";
import type { Result } from "@oko-wallet/stdlib-js";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";

import type { ClientCommitRevealSession } from "@oko-wallet-attached/crypto/commit_reveal/types";
import { createKsnCommitRevealParams } from "@oko-wallet-attached/crypto/commit_reveal/signature";

export interface RequestKeySharesV2Result {
  secp256k1?: string; // share hex string
  ed25519?: string; // share hex string
}

export interface RequestKeySharesV2Error {
  code: "INSUFFICIENT_SHARES" | "WALLET_NOT_FOUND";
  curveType?: "secp256k1" | "ed25519";
  affectedNode?: { name: string; endpoint: string };
  got?: number;
  need?: number;
}

export interface KeySharesByNode {
  node: { name: string; endpoint: string };
  shares: RequestKeySharesV2Result;
}

/**
 * Result type for requestKeySharesV2 when continueOnWalletNotFound is true.
 * Contains both successful shares and nodes that need reshare.
 */
export interface RequestKeySharesV2SuccessWithReshare {
  shares: KeySharesByNode[];
  nodesNeedingReshare: NodeStatusInfo[];
}

/**
 * Request key shares from multiple KS nodes using V2 API.
 * Supports requesting both secp256k1 and ed25519 shares in a single request.
 *
 * @param isFinal - If true, marks this as the final KSN API call for the session (cr_final: true)
 */
export async function requestKeySharesV2(
  idToken: string,
  allNodes: NodeStatusInfo[],
  threshold: number,
  authType: AuthType,
  wallets: {
    secp256k1?: string; // public key hex
    ed25519?: string; // public key hex
  },
  commitRevealSession?: ClientCommitRevealSession,
  isFinal: boolean = false,
): Promise<Result<KeySharesByNode[], RequestKeySharesV2Error>> {
  const result = await requestKeySharesV2WithReshareInfo(
    idToken,
    allNodes,
    threshold,
    authType,
    wallets,
    commitRevealSession,
    isFinal,
    false, // continueOnWalletNotFound = false for backward compatibility
  );

  if (!result.success) {
    return result;
  }

  // If there are nodes needing reshare but continueOnWalletNotFound was false,
  // this shouldn't happen, but handle it just in case
  if (result.data.nodesNeedingReshare.length > 0) {
    return {
      success: false,
      err: {
        code: "WALLET_NOT_FOUND",
        affectedNode: {
          name: result.data.nodesNeedingReshare[0].name,
          endpoint: result.data.nodesNeedingReshare[0].endpoint,
        },
      },
    };
  }

  return { success: true, data: result.data.shares };
}

/**
 * Request key shares from multiple KS nodes using V2 API.
 * Supports auto-reshare by continuing when WALLET_NOT_FOUND is encountered.
 *
 * @param isFinal - If true, marks this as the final KSN API call for the session (cr_final: true)
 * @param continueOnWalletNotFound - If true, continues collecting shares from other nodes when
 *   a node returns WALLET_NOT_FOUND, and returns the list of nodes needing reshare
 */
export async function requestKeySharesV2WithReshareInfo(
  idToken: string,
  allNodes: NodeStatusInfo[],
  threshold: number,
  authType: AuthType,
  wallets: {
    secp256k1?: string; // public key hex
    ed25519?: string; // public key hex
  },
  commitRevealSession?: ClientCommitRevealSession,
  isFinal: boolean = false,
  continueOnWalletNotFound: boolean = false,
): Promise<
  Result<RequestKeySharesV2SuccessWithReshare, RequestKeySharesV2Error>
> {
  const shuffledNodes = [...allNodes];
  for (let i = shuffledNodes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledNodes[i], shuffledNodes[j]] = [shuffledNodes[j], shuffledNodes[i]];
  }

  const succeeded: KeySharesByNode[] = [];
  const nodesNeedingReshare: NodeStatusInfo[] = [];
  let nodesToTry = shuffledNodes.slice(0, threshold);
  let backupNodes = shuffledNodes.slice(threshold);

  while (succeeded.length < threshold && nodesToTry.length > 0) {
    const results = await Promise.allSettled(
      nodesToTry.map(async (node) => {
        const commitReveal = commitRevealSession
          ? createKsnCommitRevealParams(
              commitRevealSession,
              node.endpoint,
              "get_key_shares",
              isFinal,
            )
          : undefined;
        if (commitReveal && !commitReveal.success) {
          return { success: false, err: commitReveal.err } as const;
        }
        return requestKeyShareFromNodeV2(
          idToken,
          node,
          authType,
          wallets,
          2,
          commitReveal?.data,
        );
      }),
    );

    const failedNodes: NodeStatusInfo[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const node = nodesToTry[i];

      if (result.status === "fulfilled" && result.value.success) {
        succeeded.push(result.value.data);
      } else {
        const errorCode =
          result.status === "fulfilled" && !result.value.success
            ? result.value.err
            : null;

        if (
          errorCode === "WALLET_NOT_FOUND" ||
          errorCode === "KEY_SHARE_NOT_FOUND"
        ) {
          if (continueOnWalletNotFound) {
            // Track this node as needing reshare and continue
            nodesNeedingReshare.push(node);
            // Try a backup node instead
            if (backupNodes.length > 0) {
              failedNodes.push(node); // This will trigger backup node usage
            }
          } else {
            return {
              success: false,
              err: {
                code: "WALLET_NOT_FOUND",
                affectedNode: { name: node.name, endpoint: node.endpoint },
              },
            };
          }
        } else {
          failedNodes.push(node);
        }
      }
    }

    if (succeeded.length >= threshold) {
      return {
        success: true,
        data: {
          shares: succeeded.slice(0, threshold),
          nodesNeedingReshare,
        },
      };
    }

    nodesToTry = [];
    for (let i = 0; i < failedNodes.length && backupNodes.length > 0; i++) {
      nodesToTry.push(backupNodes.shift()!);
    }
  }

  return {
    success: false,
    err: {
      code: "INSUFFICIENT_SHARES",
      got: succeeded.length,
      need: threshold,
    },
  };
}

async function requestKeyShareFromNodeV2(
  idToken: string,
  node: NodeStatusInfo,
  authType: AuthType,
  wallets: {
    secp256k1?: string;
    ed25519?: string;
  },
  maxRetries: number = 2,
  commitReveal?: CommitRevealParams,
): Promise<Result<KeySharesByNode, string>> {
  const body: GetKeyShareV2WithCRRequestBody = {
    auth_type: authType,
    wallets: {
      ...(wallets.secp256k1 && { secp256k1: wallets.secp256k1 }),
      ...(wallets.ed25519 && { ed25519: wallets.ed25519 }),
    },
    ...(commitReveal && {
      cr_session_id: commitReveal.cr_session_id,
      cr_signature: commitReveal.cr_signature,
    }),
  };

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(`${node.endpoint}/keyshare/v2/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let parsedCode: string | null = null;
        try {
          const data =
            (await response.json()) as KSNodeApiResponse<GetKeyShareV2Response>;
          if (data.success === false) {
            parsedCode = data.code || null;
            const isNotFound =
              data.code === "USER_NOT_FOUND" ||
              data.code === "WALLET_NOT_FOUND" ||
              data.code === "KEY_SHARE_NOT_FOUND";
            if (isNotFound) {
              return { success: false, err: data.code || "WALLET_NOT_FOUND" };
            }
          }
        } catch (_) {}

        if (attempt < maxRetries - 1) {
          attempt = attempt + 1;
          continue;
        }
        return { success: false, err: parsedCode ?? `HTTP_${response.status}` };
      }

      const data =
        (await response.json()) as KSNodeApiResponse<GetKeyShareV2Response>;

      if (data.success === false) {
        return { success: false, err: data.code || "UNKNOWN_ERROR" };
      }

      const shares: RequestKeySharesV2Result = {};
      if (data.data.secp256k1) {
        shares.secp256k1 = data.data.secp256k1.share;
      }
      if (data.data.ed25519) {
        shares.ed25519 = data.data.ed25519.share;
      }

      return {
        success: true,
        data: {
          node: { name: node.name, endpoint: node.endpoint },
          shares,
        },
      };
    } catch (e) {
      if (attempt < maxRetries - 1) {
        attempt = attempt + 1;
        continue;
      }
      return {
        success: false,
        err: `Failed to request key shares: ${String(e)}`,
      };
    }
  }

  return {
    success: false,
    err: "Failed to request key shares: max retries exceeded",
  };
}

/**
 * Register key shares to a single KS node using V2 API.
 * Supports registering both secp256k1 and ed25519 shares in a single request.
 */
export async function registerKeySharesV2(
  ksNodeEndpoint: string,
  idToken: string,
  authType: AuthType,
  wallets: {
    secp256k1?: { public_key: string; share: string };
    ed25519?: { public_key: string; share: string };
  },
  commitReveal?: CommitRevealParams,
): Promise<Result<void, string>> {
  const body: RegisterKeyShareV2WithCRRequestBody = {
    auth_type: authType,
    wallets: {
      ...(wallets.secp256k1 && {
        secp256k1: {
          public_key: wallets.secp256k1.public_key,
          share: wallets.secp256k1.share,
        },
      }),
      ...(wallets.ed25519 && {
        ed25519: {
          public_key: wallets.ed25519.public_key,
          share: wallets.ed25519.share,
        },
      }),
    },
    ...(commitReveal && {
      cr_session_id: commitReveal.cr_session_id,
      cr_signature: commitReveal.cr_signature,
    }),
  };

  try {
    const response = await fetch(`${ksNodeEndpoint}/keyshare/v2/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      try {
        const data = (await response.json()) as KSNodeApiResponse<void>;
        if (!data.success && data.code === "DUPLICATE_PUBLIC_KEY") {
          return { success: true, data: void 0 };
        }
      } catch (_) {}

      return {
        success: false,
        err: `Failed to register key shares: status(${response.status}) in ${ksNodeEndpoint}`,
      };
    }

    const data = (await response.json()) as KSNodeApiResponse<void>;
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to register key shares: ${data.code || "UNKNOWN_ERROR"} in ${ksNodeEndpoint}`,
      };
    }

    return { success: true, data: void 0 };
  } catch (e) {
    return {
      success: false,
      err: `Failed to register key shares in ${ksNodeEndpoint}: ${String(e)}`,
    };
  }
}

/**
 * Register ed25519 key share for an existing user who already has secp256k1 wallet.
 */
export async function registerKeyShareEd25519V2(
  ksNodeEndpoint: string,
  idToken: string,
  authType: AuthType,
  publicKey: string,
  share: string,
  commitReveal?: CommitRevealParams,
): Promise<Result<void, string>> {
  const body: RegisterEd25519V2WithCRRequestBody = {
    auth_type: authType,
    public_key: publicKey,
    share,
    ...(commitReveal && {
      cr_session_id: commitReveal.cr_session_id,
      cr_signature: commitReveal.cr_signature,
    }),
  };

  try {
    const response = await fetch(
      `${ksNodeEndpoint}/keyshare/v2/register/ed25519`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      try {
        const data = (await response.json()) as KSNodeApiResponse<void>;
        if (!data.success && data.code === "DUPLICATE_PUBLIC_KEY") {
          return { success: true, data: void 0 };
        }
      } catch (_) {}

      return {
        success: false,
        err: `Failed to register ed25519 key share: status(${response.status}) in ${ksNodeEndpoint}`,
      };
    }

    const data = (await response.json()) as KSNodeApiResponse<void>;
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to register ed25519 key share: ${data.code || "UNKNOWN_ERROR"} in ${ksNodeEndpoint}`,
      };
    }

    return { success: true, data: void 0 };
  } catch (e) {
    return {
      success: false,
      err: `Failed to register ed25519 key share in ${ksNodeEndpoint}: ${String(e)}`,
    };
  }
}

/**
 * Update existing key shares on a KS node (reshare scenario).
 */
export async function reshareKeySharesV2(
  ksNodeEndpoint: string,
  idToken: string,
  authType: AuthType,
  wallets: {
    secp256k1?: { public_key: string; share: string };
    ed25519?: { public_key: string; share: string };
  },
  commitReveal?: CommitRevealParams,
): Promise<Result<void, string>> {
  const body: ReshareKeyShareV2WithCRRequestBody = {
    auth_type: authType,
    wallets: {
      ...(wallets.secp256k1 && {
        secp256k1: {
          public_key: wallets.secp256k1.public_key,
          share: wallets.secp256k1.share,
        },
      }),
      ...(wallets.ed25519 && {
        ed25519: {
          public_key: wallets.ed25519.public_key,
          share: wallets.ed25519.share,
        },
      }),
    },
    ...(commitReveal && {
      cr_session_id: commitReveal.cr_session_id,
      cr_signature: commitReveal.cr_signature,
    }),
  };

  try {
    const response = await fetch(`${ksNodeEndpoint}/keyshare/v2/reshare`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        success: false,
        err: `Failed to reshare key shares: status(${response.status}) in ${ksNodeEndpoint}`,
      };
    }

    const data = (await response.json()) as KSNodeApiResponse<void>;
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to reshare key shares: ${data.code || "UNKNOWN_ERROR"} in ${ksNodeEndpoint}`,
      };
    }

    return { success: true, data: void 0 };
  } catch (e) {
    return {
      success: false,
      err: `Failed to reshare key shares in ${ksNodeEndpoint}: ${String(e)}`,
    };
  }
}

/**
 * Register key shares on a new node during reshare scenario.
 */
export async function reshareRegisterV2(
  ksNodeEndpoint: string,
  idToken: string,
  authType: AuthType,
  wallets: {
    secp256k1?: { public_key: string; share: string };
    ed25519?: { public_key: string; share: string };
  },
  commitReveal?: CommitRevealParams,
): Promise<Result<void, string>> {
  const body: ReshareRegisterV2WithCRRequestBody = {
    auth_type: authType,
    wallets: {
      ...(wallets.secp256k1 && {
        secp256k1: {
          public_key: wallets.secp256k1.public_key,
          share: wallets.secp256k1.share,
        },
      }),
      ...(wallets.ed25519 && {
        ed25519: {
          public_key: wallets.ed25519.public_key,
          share: wallets.ed25519.share,
        },
      }),
    },
    ...(commitReveal && {
      cr_session_id: commitReveal.cr_session_id,
      cr_signature: commitReveal.cr_signature,
    }),
  };

  try {
    const response = await fetch(
      `${ksNodeEndpoint}/keyshare/v2/reshare/register`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      return {
        success: false,
        err: `Failed to reshare register: status(${response.status}) in ${ksNodeEndpoint}`,
      };
    }

    const data = (await response.json()) as KSNodeApiResponse<void>;
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to reshare register: ${data.code || "UNKNOWN_ERROR"} in ${ksNodeEndpoint}`,
      };
    }

    return { success: true, data: void 0 };
  } catch (e) {
    return {
      success: false,
      err: `Failed to reshare register in ${ksNodeEndpoint}: ${String(e)}`,
    };
  }
}

/**
 * Commit to a KS node for commit-reveal scheme.
 */
export async function commitToKsNode(
  nodeEndpoint: string,
  sessionId: string,
  operationType: OperationType,
  clientEphemeralPubkey: string,
  idTokenHash: string,
): Promise<Result<CommitResponseData, string>> {
  const body: CommitRequestBody = {
    session_id: sessionId,
    operation_type: operationType,
    client_ephemeral_pubkey: clientEphemeralPubkey,
    id_token_hash: idTokenHash,
  };

  try {
    const response = await fetch(`${nodeEndpoint}/keyshare/v2/commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        success: false,
        err: `Failed to commit: status(${response.status}) in ${nodeEndpoint}`,
      };
    }

    const data =
      (await response.json()) as KSNodeApiResponse<CommitResponseData>;
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to commit: ${data.code || "UNKNOWN_ERROR"} in ${nodeEndpoint}`,
      };
    }

    return { success: true, data: data.data };
  } catch (e) {
    return {
      success: false,
      err: `Failed to commit in ${nodeEndpoint}: ${String(e)}`,
    };
  }
}
