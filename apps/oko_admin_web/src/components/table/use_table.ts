import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  type OnChangeFn,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

export interface UseTableOptions<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  pageCount?: number;
  manualPagination?: boolean;
}

export function useTable<T>({
  columns,
  data,
  pagination,
  onPaginationChange,
  pageCount,
  manualPagination = false,
}: UseTableOptions<T>): ReturnType<typeof useReactTable<T>> {
  const hasPagination = pagination && onPaginationChange;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel:
      hasPagination && !manualPagination ? getPaginationRowModel() : undefined,
    manualPagination,
    pageCount,
    state: hasPagination
      ? {
          pagination,
        }
      : undefined,
    onPaginationChange: hasPagination ? onPaginationChange : undefined,
  });

  return table;
}

export interface UsePaginationOptions {
  initialPageSize?: number;
  onPageChange?: (pageIndex: number) => void;
}

export interface UsePaginationReturn {
  pageIndex: number;
  pageSize: number;
  currentPage: number;
  pagination: PaginationState;
  handlePageChange: (page: number) => void;
  onPaginationChange: OnChangeFn<PaginationState>;
  setPageIndex: (index: number) => void;
}

export function useTablePagination({
  initialPageSize = 10,
  onPageChange,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(initialPageSize);

  const pagination: PaginationState = {
    pageIndex,
    pageSize,
  };

  const handlePageChange = (page: number) => {
    const newPageIndex = page - 1;
    setPageIndex(newPageIndex);
    onPageChange?.(newPageIndex);
  };

  const onPaginationChange: OnChangeFn<PaginationState> = (updaterOrValue) => {
    if (typeof updaterOrValue === "function") {
      const newPagination = updaterOrValue(pagination);
      setPageIndex(newPagination.pageIndex);
      onPageChange?.(newPagination.pageIndex);
    } else {
      setPageIndex(updaterOrValue.pageIndex);
      onPageChange?.(updaterOrValue.pageIndex);
    }
  };

  return {
    pageIndex,
    pageSize,
    currentPage: pageIndex + 1,
    pagination,
    handlePageChange,
    onPaginationChange,
    setPageIndex,
  };
}
