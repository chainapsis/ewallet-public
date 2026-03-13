"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@oko-wallet/oko-common-ui/table";
import { Toggle } from "@oko-wallet/oko-common-ui/toggle";
import type { KSNodeWithHealthCheck } from "@oko-wallet/oko-types/tss";
import { createColumnHelper, flexRender } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import type { FC } from "react";

import styles from "./keyshare_nodes_table.module.scss";
import { useActivateKSNodes } from "./use_activate_ks_nodes";
import { useDeactivateKSNodes } from "./use_deactivate_ks_nodes";
import { useDeleteKSNodes } from "./use_delete_ks_nodes";
import { EmptyState } from "@oko-wallet-admin/components/empty_state/empty_state";
import { useTable } from "@oko-wallet-admin/components/table/use_table";
import { useAllKeyShareNodes } from "@oko-wallet-admin/fetch/ks_node/use_all_ks_nodes";
import { paths } from "@oko-wallet-admin/paths";
import { Button } from "@oko-wallet-common-ui/button/button";

const columnHelper = createColumnHelper<KSNodeWithHealthCheck>();

const createColumns = (
  deactivateKSNode: ReturnType<typeof useDeactivateKSNodes>,
  activateKSNode: ReturnType<typeof useActivateKSNodes>,
  deleteKSnode: ReturnType<typeof useDeleteKSNodes>,
  router: ReturnType<typeof useRouter>,
) => [
  columnHelper.accessor((row) => row.node_id, {
    id: "node_id",
    header: "Node ID",
    cell: (info) => (
      <div
        className={styles.nodeId}
        onClick={() => {
          router.push(`${paths.ks_nodes_edit}/${info.getValue()}`);
        }}
      >
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.node_name, {
    id: "node_name",
    header: "Name",
    cell: (info) => <div className={styles.nodeName}>{info.getValue()}</div>,
  }),
  columnHelper.accessor((row) => row.status, {
    id: "status",
    header: "Status",
    cell: (info) => (
      <div
        className={`${styles.status} ${styles[info.getValue().toLowerCase()]}`}
      >
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.server_url, {
    id: "server_url",
    header: "Server URL",
    cell: (info) => <div className={styles.serverUrl}>{info.getValue()}</div>,
  }),
  columnHelper.accessor((row) => row.health_check_status, {
    id: "health_check_status",
    header: "Health",
    cell: (info) => {
      const value = info.getValue();
      const statusClass = value ? styles[value.toLowerCase()] : "";
      return (
        <div className={`${styles.healthCheckStatus} ${statusClass}`}>
          {value ?? "N/A"}
        </div>
      );
    },
  }),
  columnHelper.accessor((row) => row.health_checked_at, {
    id: "health_checked_at",
    header: "Checked At",
    cell: (info) => {
      const value = info.getValue();
      if (!value) {
        return <div className={styles.healthCheckedAt}>N/A</div>;
      }

      const date = new Date(value);

      return (
        <div className={styles.healthCheckedAt}>
          {date.toLocaleString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}
        </div>
      );
    },
  }),
  columnHelper.accessor((row) => row.node_id, {
    id: "status_toggle",
    header: "Activate",
    cell: (info) => {
      const isActive = info.row.original.status === "ACTIVE";
      const nodeId = info.getValue();

      const handleToggle = (checked: boolean) => {
        if (checked) {
          if (
            confirm(
              `Are you sure you want to activate this keyshare node?\nnode_id: ${nodeId}`,
            )
          ) {
            activateKSNode.mutate({ node_id: nodeId });
          }
        } else {
          if (
            confirm(
              `Are you sure you want to deactivate this keyshare node?\nnode_id: ${nodeId}`,
            )
          ) {
            deactivateKSNode.mutate({ node_id: nodeId });
          }
        }
      };

      return (
        <Toggle
          checked={isActive}
          onChange={handleToggle}
          className={styles.statusToggle}
        />
      );
    },
  }),
  columnHelper.accessor((row) => row.node_id, {
    id: "delete_button",
    header: "Delete",
    cell: (info) => {
      const nodeId = info.getValue();

      function handleDeleteKSNode() {
        if (
          confirm(
            `Are you sure you want to delete this keyshare node? This it NOT recoveable\nnode_id: ${nodeId}`,
          )
        ) {
          deleteKSnode.mutate({ node_id: nodeId });
        }
      }

      return (
        <div className={styles.cellCenter}>
          <Button
            onClick={handleDeleteKSNode}
            className={`${styles.dangerButton} ${styles.deleteButton}`}
          >
            Delete
          </Button>
        </div>
      );
    },
  }),
];

export const KeyshareNodesTable: FC = () => {
  // TO-DO: Pagination is not supported yet.
  // const { pagination, onPaginationChange } = useTablePagination({
  //   initialPageSize: 10,
  // });

  const { data: nodeData } = useAllKeyShareNodes();
  const deactivateKSNode = useDeactivateKSNodes();
  const activateKSNode = useActivateKSNodes();
  const deleteKSNode = useDeleteKSNodes();
  const router = useRouter();

  const table = useTable({
    columns: createColumns(
      deactivateKSNode,
      activateKSNode,
      deleteKSNode,
      router,
    ),
    data: nodeData?.ksNodes ?? [],
    // pagination,
    // onPaginationChange,
    pageCount: 1, // nodeData?.pagination?.total_pages ?? 0,
    manualPagination: true,
  });

  if (nodeData?.ksNodes.length === 0) {
    return <EmptyState text="No Keyshare Nodes here yet." />;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableWrapper}>
        <Table variant="bordered" noWrap>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHeaderCell key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHeaderCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      /> */}
    </div>
  );
};
