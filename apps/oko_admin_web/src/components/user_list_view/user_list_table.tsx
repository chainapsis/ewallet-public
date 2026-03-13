"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@oko-wallet/oko-common-ui/table";
import { flexRender } from "@tanstack/react-table";
import type { FC } from "react";

import { Pagination } from "../pagination/pagination";
import { useUserListTable } from "./use_user_list_table";
import styles from "./user_list_table.module.scss";

export const UserListTable: FC = () => {
  const { table, totalPageCount, currentPage, handlePageChange } =
    useUserListTable();

  return (
    <div className={styles.tableWrapper}>
      <Table variant="bordered">
        <TableHead>
          <TableRow>
            {table.getFlatHeaders().map((header) => (
              <TableHeaderCell key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </TableHeaderCell>
            ))}
          </TableRow>
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPageCount}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
