import { type GetKeyShareResponse } from "@oko-wallet/ksn-interface/key_share";
import type { NodeStatusInfo } from "@oko-wallet/oko-types/tss";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type {
  Point256,
  UserKeySharePointByNode,
} from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";

import type { RequestSplitSharesError } from "../types/ks_node_request";
import type { Bytes33 } from "@oko-wallet/bytes";
import {
  decodeKeyShareStringToPoint256,
  encodePoint256ToKeyShareString,
} from "@oko-wallet-attached/crypto/key_share_utils";

export async function requestSplitShares(
  publicKey: Bytes33,
  idToken: string,
  allNodes: NodeStatusInfo[],
  threshold: number,
  authType: AuthType = "google",
): Promise<Result<UserKeySharePointByNode[], RequestSplitSharesError>> {
  const shuffledNodes = [...allNodes];
  for (let i = shuffledNodes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledNodes[i], shuffledNodes[j]] = [shuffledNodes[j], shuffledNodes[i]];
  }

  const succeeded: UserKeySharePointByNode[] = [];
  let nodesToTry = shuffledNodes.slice(0, threshold);
  let backupNodes = shuffledNodes.slice(threshold);

  while (succeeded.length < threshold && nodesToTry.length > 0) {
    const results = await Promise.allSettled(
      nodesToTry.map((node) =>
        requestSplitShare(publicKey, idToken, node, authType),
      ),
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

        if (errorCode === "WALLET_NOT_FOUND") {
          return {
            success: false,
            err: {
              code: "WALLET_NOT_FOUND",
              affectedNode: { name: node.name, endpoint: node.endpoint },
            },
          };
        }

        failedNodes.push(node);
      }
    }

    if (succeeded.length >= threshold) {
      return {
        success: true,
        data: succeeded.slice(0, threshold),
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

export async function requestSplitShare(
  publicKey: Bytes33,
  idToken: string,
  node: NodeStatusInfo,
  authType: AuthType,
  maxRetries: number = 2,
): Promise<Result<UserKeySharePointByNode, string>> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(`${node.endpoint}/keyshare/v1/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_type: authType,
          public_key: publicKey.toHex(),
        }),
      });

      if (!response.ok) {
        let parsedCode: string | null = null;
        try {
          const data =
            (await response.json()) as KSNodeApiResponse<GetKeyShareResponse>;
          if (data.success === false) {
            parsedCode = data.code || null;
            const isNotFound =
              data.code === "USER_NOT_FOUND" ||
              data.code === "WALLET_NOT_FOUND";
            if (isNotFound) {
              return { success: false, err: "WALLET_NOT_FOUND" };
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
        (await response.json()) as KSNodeApiResponse<GetKeyShareResponse>;

      if (data.success === false) {
        return { success: false, err: data.code || "UNKNOWN_ERROR" };
      }

      const sharePointRes = decodeKeyShareStringToPoint256(data.data.share);
      if (sharePointRes.success === false) {
        return { success: false, err: sharePointRes.err };
      }

      return {
        success: true,
        data: {
          node: {
            name: node.name,
            endpoint: node.endpoint,
          },
          share: sharePointRes.data,
        },
      };
    } catch (e) {
      if (attempt < maxRetries - 1) {
        attempt = attempt + 1;
        continue;
      }
      return {
        success: false,
        err: `Failed to request split share: ${String(e)}`,
      };
    }
  }

  return {
    success: false,
    err: "Failed to request split share: max retries exceeded",
  };
}

export async function doSendUserKeyShares(
  ksNodeEndpoint: string,
  idToken: string,
  publicKey: Bytes33,
  serverShare: Point256,
  authType: AuthType,
): Promise<Result<void, string>> {
  try {
    const serverShareString = encodePoint256ToKeyShareString(serverShare);
    const response = await fetch(`${ksNodeEndpoint}/keyshare/v1/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_type: authType,
        curve_type: "secp256k1",
        public_key: publicKey.toHex(),
        share: serverShareString,
      }),
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
        err: `Failed to send key share: status(${response.status}) \
message(${response.statusText}) in ${ksNodeEndpoint}`,
      };
    }

    const data = (await response.json()) as { success: boolean };
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to register key share in ${ksNodeEndpoint}`,
      };
    }
    return {
      success: true,
      data: void 0,
    };
  } catch (e) {
    return {
      success: false,
      err: `Failed to send key share in ${ksNodeEndpoint}: ${String(e)}`,
    };
  }
}

export async function doSendResharedUserKeyShares(
  ksNodeEndpoint: string,
  idToken: string,
  publicKey: Bytes33,
  resharedKeyShare: Point256,
  authType: AuthType,
): Promise<Result<void, string>> {
  try {
    const response = await fetch(`${ksNodeEndpoint}/keyshare/v1/reshare`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_type: authType,
        curve_type: "secp256k1",
        public_key: publicKey.toHex(),
        share: encodePoint256ToKeyShareString(resharedKeyShare),
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        err: `Failed to send key share: status(${response.status}) \
message(${response.statusText}) in ${ksNodeEndpoint}`,
      };
    }

    const data = (await response.json()) as { success: boolean };
    if (data.success === false) {
      return {
        success: false,
        err: `Failed to register key share in ${ksNodeEndpoint}`,
      };
    }
    return {
      success: true,
      data: void 0,
    };
  } catch (e) {
    return {
      success: false,
      err: `Failed to send key share in ${ksNodeEndpoint}: ${String(e)}`,
    };
  }
}
