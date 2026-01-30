import React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import type { UserWithWalletsResponse } from "@oko-wallet/oko-types/admin";
import type { KSNodeWithHealthCheck } from "@oko-wallet/oko-types/tss";

import {
  useTable,
  useTablePagination,
} from "@oko-wallet-admin/components/table/use_table";
import { useGetUsers } from "./use_get_users";
import styles from "./user_list_table.module.scss";
import cn from "classnames";
import { useAllKeyShareNodes } from "@oko-wallet-admin/fetch/ks_node/use_all_ks_nodes";

const columnHelper = createColumnHelper<UserWithWalletsResponse>();

function renderKSNodes(
  walletKSNodes: string[],
  allKeyShareNodesData: { ksNodes: KSNodeWithHealthCheck[] } | undefined,
) {
  const connectedNodes = (allKeyShareNodesData?.ksNodes ?? []).filter((node) =>
    walletKSNodes.includes(node.node_id),
  );

  if (connectedNodes.length === 0) {
    return <span className={styles.emptyValue}>-</span>;
  }

  return (
    <div className={styles.ksNodesContainer}>
      {connectedNodes.map((node) => {
        const isActive = node.status === "ACTIVE";
        const nodeClassName = cn(styles.nodeName, {
          [styles.nodeActive]: isActive,
          [styles.nodeInactive]: !isActive,
        });

        return (
          <span key={node.node_id} className={nodeClassName}>
            {node.node_name}
          </span>
        );
      })}
    </div>
  );
}

function renderWalletsCell(
  row: UserWithWalletsResponse,
  allKeyShareNodesData: { ksNodes: KSNodeWithHealthCheck[] } | undefined,
) {
  const hasSecp256k1 = row.secp256k1_public_key !== null;
  const hasEd25519 = row.ed25519_public_key !== null;

  if (!hasSecp256k1 && !hasEd25519) {
    return <div className={styles.emptyValue}>-</div>;
  }

  return (
    <table className={styles.walletsTable}>
      <tbody>
        {hasSecp256k1 && (
          <tr>
            <td className={styles.curveCell}>
              <span className={cn(styles.curveLabel, styles.secp256k1)}>
                secp256k1
              </span>
            </td>
            <td className={styles.publicKeyCell}>
              <span className={styles.publicKey}>
                {row.secp256k1_public_key}
              </span>
            </td>
            <td className={styles.ksNodesCell}>
              {renderKSNodes(row.secp256k1_ks_nodes, allKeyShareNodesData)}
            </td>
          </tr>
        )}
        {hasEd25519 && (
          <tr>
            <td className={styles.curveCell}>
              <span className={cn(styles.curveLabel, styles.ed25519)}>
                ed25519
              </span>
            </td>
            <td className={styles.publicKeyCell}>
              <span className={styles.publicKey}>{row.ed25519_public_key}</span>
            </td>
            <td className={styles.ksNodesCell}>
              {renderKSNodes(row.ed25519_ks_nodes, allKeyShareNodesData)}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function createColumns(
  allKeyShareNodesData:
    | {
        ksNodes: KSNodeWithHealthCheck[];
      }
    | undefined,
) {
  return [
    columnHelper.accessor((row) => row.auth_type, {
      id: "auth_type",
      header: "Auth Type",
    }),
    columnHelper.accessor((row) => row.email, {
      id: "email",
      header: "User Identifier",
      size: 200,
      maxSize: 200,
    }),
    columnHelper.display({
      id: "wallets",
      header: "Wallets",
      cell: ({ row }) =>
        renderWalletsCell(row.original, allKeyShareNodesData),
    }),
  ];
}

export function useUserListTable() {
  const {
    pageIndex,
    currentPage,
    handlePageChange,
    pagination,
    onPaginationChange,
  } = useTablePagination({
    initialPageSize: 10,
  });

  const { data } = useGetUsers(pageIndex);

  const users = data?.users ?? [];
  const totalPageCount = data?.pagination?.total_pages ?? 0;

  const { data: allKeyShareNodesData } = useAllKeyShareNodes();
  const columns = createColumns(allKeyShareNodesData);

  const table = useTable({
    columns,
    data: users,
    pagination,
    onPaginationChange,
    pageCount: totalPageCount,
    manualPagination: true,
  });

  return { table, currentPage, totalPageCount, handlePageChange };
}
