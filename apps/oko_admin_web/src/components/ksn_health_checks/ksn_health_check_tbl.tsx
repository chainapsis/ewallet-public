"use client";

import { type FC } from "react";
import { createColumnHelper, flexRender } from "@tanstack/react-table";
import type { KSNodeHealthCheck } from "@oko-wallet/oko-types/tss";
import type { WithTime } from "@oko-wallet/oko-types/aux_types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@oko-wallet/oko-common-ui/table";

import styles from "./ksn_health_check_tbl.module.scss";
import {
  useTable,
  useTablePagination,
} from "@oko-wallet-admin/components/table/use_table";
import { useKSNHealthChecks } from "@oko-wallet-admin/fetch/ks_node/use_ksn_health_checks";

const columnHelper = createColumnHelper<WithTime<KSNodeHealthCheck>>();

const columns = [
  columnHelper.accessor("node_id", {
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("created_at", {
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("status", {
    cell: (info) => info.getValue(),
  }),
];

export const KSNHealthCheckTable: FC = () => {
  const {
    currentPage,
    handlePageChange,
    pagination,
    onPaginationChange,
  } = useTablePagination({
    initialPageSize: 20,
  });

  const { data } = useKSNHealthChecks(pagination);

  const hasNext = data?.has_next ?? false;
  const hasPrev = currentPage > 1;

  const table = useTable({
    columns,
    data: data?.rows ?? [],
    pagination,
    onPaginationChange,
    manualPagination: true,
  });

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
      <div className={styles.paginationWrapper}>
        <button
          className={styles.navButton}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!hasPrev}
        >
          Prev
        </button>
        <span className={styles.pageInfo}>Page {currentPage}</span>
        <button
          className={styles.navButton}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!hasNext}
        >
          Next
        </button>
      </div>
    </div>
  );
};
