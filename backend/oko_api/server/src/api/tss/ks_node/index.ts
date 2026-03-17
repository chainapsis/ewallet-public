import type { Bytes32, Bytes33 } from "@oko-wallet/bytes";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { CurveType } from "@oko-wallet/oko-types/crypto";
import type { KeyShareNode } from "@oko-wallet/oko-types/tss";

import {
  requestCheckKeyShare,
  requestCheckKeyShareV2,
} from "@oko-wallet-api/requests";

export async function checkKeyShareFromKSNodes(
  userEmail: string,
  publicKey: Bytes32 | Bytes33,
  targetKSNodes: KeyShareNode[],
  auth_type: AuthType,
  curve_type: CurveType,
): Promise<OkoApiResponse<{ nodeIds: string[] }>> {
  try {
    const nodeServerUrls: string[] = [];
    const nodeIds: string[] = [];

    targetKSNodes.forEach((ksNode) => {
      nodeServerUrls.push(ksNode.server_url);
      nodeIds.push(ksNode.node_id);
    });

    const results = await Promise.allSettled(
      nodeServerUrls.map(async (nodeServerUrl) => {
        const res = await requestCheckKeyShare(
          nodeServerUrl,
          userEmail,
          publicKey,
          auth_type,
          curve_type,
        );

        if (res.success === false) {
          return {
            success: false,
            code: res.code,
            err: res.msg,
          };
        }

        return {
          success: true,
          data: res.data,
        };
      }),
    );

    const errorResults = results
      .map((result, index) => {
        return {
          index,
          resContent: result,
        };
      })
      .filter(
        (result) =>
          result.resContent.status === "rejected" ||
          result.resContent.value.success === false ||
          (result.resContent.value.data &&
            result.resContent.value.data.exists === false),
      );

    if (errorResults.length > 0) {
      const errArr = [];
      for (const err of errorResults) {
        const comm = targetKSNodes[err.index];

        if (err.resContent.status === "rejected") {
          errArr.push(`name: ${comm.node_name}, err: ${err.resContent.reason}`);
        } else if (err.resContent.value.success === false) {
          errArr.push(
            `name: ${comm.node_name}, err: ${err.resContent.value.err}`,
          );
        } else if (
          err.resContent.value.data &&
          err.resContent.value.data.exists === false
        ) {
          errArr.push(`name: ${comm.node_name}, err: keyshare does not exist`);
        } else {
          errArr.push(
            `name: ${comm.node_name}, err: ${err.resContent.value.err}`,
          );
        }
      }

      const errMsg = errArr.join("\n");

      return {
        success: false,
        code: "KEYSHARE_NODE_INSUFFICIENT",
        msg: errMsg,
      };
    }

    return {
      success: true,
      data: {
        nodeIds,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface CheckKeyShareV2Result {
  secp256k1?: { nodeIds: string[] };
  ed25519?: { nodeIds: string[] };
}

export async function checkKeyShareFromKSNodesV2(
  userEmail: string,
  wallets: {
    secp256k1?: Bytes33;
    ed25519?: Bytes32;
  },
  targetKSNodes: KeyShareNode[],
  auth_type: AuthType,
  registrationThreshold?: number | null,
): Promise<OkoApiResponse<CheckKeyShareV2Result>> {
  try {
    const nodeServerUrls: string[] = [];
    const nodeIds: string[] = [];

    targetKSNodes.forEach((ksNode) => {
      nodeServerUrls.push(ksNode.server_url);
      nodeIds.push(ksNode.node_id);
    });

    const results = await Promise.allSettled(
      nodeServerUrls.map(async (nodeServerUrl, index) => {
        const res = await requestCheckKeyShareV2(
          nodeServerUrl,
          userEmail,
          auth_type,
          wallets,
        );

        if (res.success === false) {
          return {
            success: false as const,
            nodeId: nodeIds[index],
            code: res.code,
            err: res.msg,
          };
        }

        return {
          success: true as const,
          nodeId: nodeIds[index],
          data: res.data,
        };
      }),
    );

    const secp256k1SuccessNodeIds: string[] = [];
    const ed25519SuccessNodeIds: string[] = [];
    const secp256k1Errors: string[] = [];
    const ed25519Errors: string[] = [];

    results.forEach((result, index) => {
      const nodeName = targetKSNodes[index].node_name;
      const nodeId = nodeIds[index];

      if (result.status === "rejected") {
        if (wallets.secp256k1) {
          secp256k1Errors.push(`name: ${nodeName}, err: ${result.reason}`);
        }
        if (wallets.ed25519) {
          ed25519Errors.push(`name: ${nodeName}, err: ${result.reason}`);
        }
        return;
      }

      if (result.value.success === false) {
        if (wallets.secp256k1) {
          secp256k1Errors.push(`name: ${nodeName}, err: ${result.value.err}`);
        }
        if (wallets.ed25519) {
          ed25519Errors.push(`name: ${nodeName}, err: ${result.value.err}`);
        }
        return;
      }

      const data = result.value.data;
      if (wallets.secp256k1) {
        if (data.secp256k1?.exists) {
          secp256k1SuccessNodeIds.push(nodeId);
        } else {
          secp256k1Errors.push(
            `name: ${nodeName}, err: secp256k1 keyshare does not exist`,
          );
        }
      }
      if (wallets.ed25519) {
        if (data.ed25519?.exists) {
          ed25519SuccessNodeIds.push(nodeId);
        } else {
          ed25519Errors.push(
            `name: ${nodeName}, err: ed25519 keyshare does not exist`,
          );
        }
      }
    });

    // When registrationThreshold is set, allow partial success
    const usePartialSuccess =
      registrationThreshold != null && registrationThreshold > 0;

    if (usePartialSuccess) {
      if (
        wallets.secp256k1 &&
        secp256k1SuccessNodeIds.length < registrationThreshold
      ) {
        return {
          success: false,
          code: "KEYSHARE_NODE_INSUFFICIENT",
          msg: `secp256k1: ${secp256k1SuccessNodeIds.length}/${targetKSNodes.length} nodes succeeded (need ${registrationThreshold})\n${secp256k1Errors.join("\n")}`,
        };
      }
      if (
        wallets.ed25519 &&
        ed25519SuccessNodeIds.length < registrationThreshold
      ) {
        return {
          success: false,
          code: "KEYSHARE_NODE_INSUFFICIENT",
          msg: `ed25519: ${ed25519SuccessNodeIds.length}/${targetKSNodes.length} nodes succeeded (need ${registrationThreshold})\n${ed25519Errors.join("\n")}`,
        };
      }
    } else {
      // All nodes must have keyshares (original behavior)
      if (wallets.secp256k1 && secp256k1Errors.length > 0) {
        return {
          success: false,
          code: "KEYSHARE_NODE_INSUFFICIENT",
          msg: secp256k1Errors.join("\n"),
        };
      }
      if (wallets.ed25519 && ed25519Errors.length > 0) {
        return {
          success: false,
          code: "KEYSHARE_NODE_INSUFFICIENT",
          msg: ed25519Errors.join("\n"),
        };
      }
    }

    const responseData: CheckKeyShareV2Result = {};
    if (wallets.secp256k1) {
      responseData.secp256k1 = {
        nodeIds: usePartialSuccess ? secp256k1SuccessNodeIds : nodeIds,
      };
    }
    if (wallets.ed25519) {
      responseData.ed25519 = {
        nodeIds: usePartialSuccess ? ed25519SuccessNodeIds : nodeIds,
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: error instanceof Error ? error.message : String(error),
    };
  }
}
