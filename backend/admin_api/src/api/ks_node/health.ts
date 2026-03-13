import {
  createKSNodeHealthChecks,
  getAllKSNodes,
  selectKSNodeHealthChecks,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import type { KSNodeHealthCheck } from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

import type { OkoApiResponse } from "@oko-wallet-types/api_response";
import type { WithPagination, WithTime } from "@oko-wallet-types/aux_types";

export async function healthCheckKSNode(
  db: Pool | PoolClient,
): Promise<Result<number, string>> {
  const getAllKSNodesRes = await getAllKSNodes(db);
  if (getAllKSNodesRes.success === false) {
    return {
      success: false,
      err: `Failed to get all ksNodes: ${getAllKSNodesRes.err}`,
    };
  }

  const nodes = getAllKSNodesRes.data;

  const healthChecks = await Promise.all(
    nodes.map(async (node) => {
      const isHealthy = await requestKSNodeHealthCheck(node.server_url);

      const check: KSNodeHealthCheck = {
        check_id: uuidv4(),
        node_id: node.node_id,
        status: isHealthy ? "HEALTHY" : "UNHEALTHY",
      };

      return check;
    }),
  );

  const createKSNodeHealthChecksRes = await createKSNodeHealthChecks(
    db,
    healthChecks,
  );
  if (createKSNodeHealthChecksRes.success === false) {
    return {
      success: false,
      err: `Failed to create ksNode health checks: ${createKSNodeHealthChecksRes.err}`,
    };
  }

  return {
    success: true,
    data: healthChecks.length,
  };
}

async function requestKSNodeHealthCheck(cvEndpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${cvEndpoint}/`);
    if (response.status !== 200) {
      return false;
    }
    const data = await response.text();
    return data === "Ok";
  } catch {
    return false;
  }
}

export async function getKSNHealthChecks(
  db: Pool | PoolClient,
  pageIdx: number,
  pageSize: number,
): Promise<OkoApiResponse<WithPagination<WithTime<KSNodeHealthCheck>[]>>> {
  const healthChecksRes = await selectKSNodeHealthChecks(db, pageIdx, pageSize);

  if (healthChecksRes.success === false) {
    return {
      success: false,
      code: "HEALTH_CHECK_NOT_FOUND",
      msg: `Failed to get ksn health checks: ${healthChecksRes.err}`,
    };
  }

  return {
    success: true,
    data: {
      rows: healthChecksRes.data.rows,
      has_next: healthChecksRes.data.has_next,
    },
  };
}
