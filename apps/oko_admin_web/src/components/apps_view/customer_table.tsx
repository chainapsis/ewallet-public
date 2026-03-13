import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { Button } from "@oko-wallet/oko-common-ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@oko-wallet/oko-common-ui/table";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { CustomerWithAPIKeys } from "@oko-wallet/oko-types/customers";
import { createColumnHelper, flexRender } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FC } from "react";

import { APIKeyCell } from "./api_key_cell";
import styles from "./customer_table.module.scss";
import { useGetCustomerListWithAPIKeys } from "./use_get_customer";
import { useDeleteCustomerAndCTDUsers } from "./user_delete_customer_and_ctd_users";
import { UserEmailVerifiedCell } from "./user_email_verified_cell";
import { AccountInfoBase } from "@oko-wallet-admin/components/account/account_info_base";
import { EmptyState } from "@oko-wallet-admin/components/empty_state/empty_state";
import { Pagination } from "@oko-wallet-admin/components/pagination/pagination";
import {
  useTable,
  useTablePagination,
} from "@oko-wallet-admin/components/table/use_table";
import { paths } from "@oko-wallet-admin/paths";

const defaultData: CustomerWithAPIKeys[] = [];

const columnHelper = createColumnHelper<CustomerWithAPIKeys>();

function createColumns(onDeleteCustomer: (customerId: string) => void) {
  return [
    columnHelper.accessor(
      (row) => {
        console.log(row.customer.logo_url);
        return {
          customer_id: row.customer.customer_id,
          label: row.customer.label,
          logo_url: row.customer.logo_url,
        };
      },
      {
        id: "customer_id",
        header: "App Name",
        cell: (info) => (
          <Link href={`/apps/${info.getValue().customer_id}`}>
            <AccountInfoBase
              username={info.getValue().label}
              email=""
              avatarUrl={info.getValue().logo_url ?? undefined}
            />
          </Link>
        ),
      },
    ),
    columnHelper.accessor(
      (row) =>
        row.api_keys.map((apiKey) => {
          return {
            api_key: apiKey.hashed_key,
            is_active: apiKey.is_active,
          };
        }),
      {
        id: "api_keys",
        header: "API Key",
        cell: (info) => <APIKeyCell apiKeys={info.getValue()} />,
      },
    ),
    columnHelper.accessor(
      (row) =>
        row.customer_dashboard_users.map((user) => {
          return {
            email: user.email,
            is_email_verified: user.is_email_verified,
            has_sent_inactive_reminder: user.has_sent_inactive_reminder,
            has_sent_unverified_reminder: user.has_sent_unverified_reminder,
          };
        }),
      {
        id: "users",
        header: "Users",
        cell: (info) => {
          const _val = info.getValue();
          return <UserEmailVerifiedCell users={info.getValue()} />;
        },
      },
    ),
    columnHelper.accessor((row) => row.customer.url, {
      id: "url",
      header: "App URL",
      cell: (info) => (
        <Link href={info.getValue() || ""} target="_blank">
          <Typography
            color="tertiary"
            size="sm"
            weight="medium"
            className={styles.urlText}
          >
            {info.getValue()}
          </Typography>
        </Link>
      ),
    }),
    columnHelper.accessor((row) => row.has_tss_sessions ?? false, {
      id: "has_tss_sessions",
      header: "TxActive",
      cell: (info) => (
        <Badge
          label={info.getValue() ? "Active" : "Inactive"}
          color={info.getValue() ? "success" : "error"}
          size="sm"
        />
      ),
    }),
    columnHelper.accessor((row) => row.customer.customer_id, {
      id: "delete",
      header: "Delete",
      cell: (info) => (
        <Button
          className={styles.deleteButton}
          onClick={() => {
            if (
              confirm(
                `Are you sure you want to delete this customer and related CTD users?: customer_id: ${info.getValue()}`,
              )
            ) {
              onDeleteCustomer(info.getValue());
            }
          }}
        >
          Delete
        </Button>
      ),
    }),
  ];
}

export const CustomerTable: FC = () => {
  const router = useRouter();
  const deleteCustomerAndCTDUsers = useDeleteCustomerAndCTDUsers();
  const handleDeleteCustomer = (customerId: string) => {
    deleteCustomerAndCTDUsers.mutate({ customer_id: customerId });
  };

  const {
    pageIndex,
    currentPage,
    handlePageChange,
    pagination,
    onPaginationChange,
  } = useTablePagination({
    initialPageSize: 10,
  });

  const { data } = useGetCustomerListWithAPIKeys(pageIndex);

  const customerList = data?.customerWithAPIKeysList ?? defaultData;
  const totalPages = data?.pagination?.total_pages ?? 0;

  const columns = createColumns(handleDeleteCustomer);

  const table = useTable({
    columns,
    data: customerList,
    pagination,
    onPaginationChange,
    pageCount: totalPages,
    manualPagination: true,
  });

  if (customerList.length === 0) {
    return (
      <EmptyState
        text="No Apps here yet. Let's get started!"
        showButton={true}
        buttonText="Add New App"
        onButtonClick={() => router.push(paths.apps_create)}
      />
    );
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
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
