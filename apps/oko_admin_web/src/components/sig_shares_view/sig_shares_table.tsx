import { useEffect, useRef, useState, type FC } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createColumnHelper, flexRender } from "@tanstack/react-table";
import { type TssSessionWithCustomerAndUser } from "@oko-wallet/oko-types/tss";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@oko-wallet/oko-common-ui/table";
import { Dropdown } from "@oko-wallet/oko-common-ui/dropdown";
import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";

import styles from "./sig_shares_table.module.scss";
import { useGetTSSSessionsList } from "./use_get_tss_sessions";
import { useGetAllCustomers } from "./use_get_all_customers";
import { EmptyState } from "@oko-wallet-admin/components/empty_state/empty_state";
import {
  useTable,
  useTablePagination,
} from "@oko-wallet-admin/components/table/use_table";
import { useAllKeyShareNodes } from "@oko-wallet-admin/fetch/ks_node/use_all_ks_nodes";

const CUSTOMER_ID = "customer_id";
const APP_ID = "app_id";
const NODE_ID = "node_id";
const CURVE_TYPE = "curve_type";

const defaultData: TssSessionWithCustomerAndUser[] = [];

const columnHelper = createColumnHelper<TssSessionWithCustomerAndUser>();

const columns = [
  columnHelper.accessor((row) => row.customer_label, {
    id: "customer_label",
    header: "App Name (Host App)",
    cell: (info) => {
      const customerUrl = info.row.original.customer_url;
      return customerUrl ? (
        <Link
          href={customerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.customerLink}
        >
          {info.getValue()}
        </Link>
      ) : (
        <div className={styles.customerLabel}>{info.getValue()}</div>
      );
    },
  }),
  columnHelper.accessor((row) => row.state, {
    id: "state",
    header: "State",
    cell: (info) => {
      const value = info.getValue();
      const isCompleted = value === "COMPLETED";
      return (
        <div
          className={`${styles.state} ${isCompleted ? styles.completed : ""}`}
        >
          {value}
        </div>
      );
    },
  }),
  columnHelper.accessor((row) => row.session_id, {
    id: "session_id",
    header: "Session ID",
    cell: (info) => <div className={styles.sessionId}>{info.getValue()}</div>,
  }),
  columnHelper.accessor((row) => row.user_email, {
    id: "user_email",
    header: "User Identifier",
    cell: (info) => <div className={styles.userEmail}>{info.getValue()}</div>,
  }),
  columnHelper.accessor((row) => row.wallet_id, {
    id: "wallet_id",
    header: "Wallet ID",
    cell: (info) => <div className={styles.walletId}>{info.getValue()}</div>,
  }),
  columnHelper.accessor((row) => row.curve_type, {
    id: "curve_type",
    header: "Curve Type",
    cell: (info) => <div>{info.getValue()}</div>,
  }),
  columnHelper.accessor((row) => row.wallet_public_key, {
    id: "wallet_public_key",
    header: "Public Key",
    cell: (info) => (
      <div className={styles.walletPublicKey}>{info.getValue()}</div>
    ),
  }),
  columnHelper.accessor((row) => row.created_at, {
    id: "created_at",
    header: "Created At",
    cell: (info) => {
      const value = info.getValue();
      const date = new Date(value);

      return (
        <div className={styles.createdAt}>
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
  columnHelper.accessor((row) => row.updated_at, {
    id: "updated_at",
    header: "Updated At",
    cell: (info) => {
      const value = info.getValue();
      const date = new Date(value);

      return (
        <div className={styles.updatedAt}>
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
];

export const SigSharesTable: FC = () => {
  const {
    pageIndex,
    currentPage,
    handlePageChange,
    pagination,
    onPaginationChange,
  } = useTablePagination({
    initialPageSize: 10,
  });

  const { data: nodeData } = useAllKeyShareNodes();
  const { data: customerData } = useGetAllCustomers();

  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCustomerId =
    searchParams.get(CUSTOMER_ID) || searchParams.get(APP_ID);
  const selectedNodeId = searchParams.get(NODE_ID);
  const selectedCurveType = searchParams.get(CURVE_TYPE);

  const getFilterType = () => {
    if (selectedNodeId) {
      return "node";
    }
    if (selectedCustomerId) {
      return "app";
    }
    return "app";
  };

  const [filterType, setFilterType] = useState<"app" | "node">(getFilterType());

  const isUserChangingFilterType = useRef(false);

  useEffect(() => {
    if (isUserChangingFilterType.current) {
      return;
    }

    if (selectedNodeId && filterType !== "node") {
      setFilterType("node");
      return;
    }
    if (!selectedNodeId && selectedCustomerId && filterType !== "app") {
      setFilterType("app");
      return;
    }
  }, [selectedCustomerId, selectedNodeId, filterType]);

  const handleFilterTypeChange = (type: "app" | "node") => {
    isUserChangingFilterType.current = true;

    setFilterType(type);

    const params = new URLSearchParams(searchParams.toString());

    if (type === "app") {
      params.delete(NODE_ID);
    } else {
      params.delete(CUSTOMER_ID);
      params.delete(APP_ID);
    }

    router.push(`?${params.toString()}`, { scroll: false });

    setTimeout(() => {
      isUserChangingFilterType.current = false;
    }, 100);
  };

  const handleCustomerChange = (customerId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (customerId) {
      params.set(CUSTOMER_ID, customerId);
      params.delete(APP_ID);
    } else {
      params.delete(CUSTOMER_ID);
      params.delete(APP_ID);
    }

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const toggleKSNode = (nodeId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!nodeId || nodeId === "") {
      params.delete(NODE_ID);
    } else {
      params.set(NODE_ID, nodeId);
    }

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleCurveTypeChange = (curveType: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (curveType) {
      params.set(CURVE_TYPE, curveType);
    } else {
      params.delete(CURVE_TYPE);
    }

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const { data } = useGetTSSSessionsList({
    page: pageIndex,
    nodeId: selectedNodeId || undefined,
    customerId: selectedCustomerId || undefined,
    curveType: selectedCurveType || undefined,
  });

  const tssSessions = data?.tss_sessions ?? defaultData;
  const hasNext = data?.pagination?.has_next ?? false;
  const hasPrev = data?.pagination?.has_prev ?? false;

  const table = useTable({
    columns,
    data: tssSessions,
    pagination,
    onPaginationChange,
    manualPagination: true,
  });

  const selectedCustomer = customerData?.find(
    (c) => c.customer.customer_id === selectedCustomerId,
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.filtersWrapper}>
        <Typography size="md" weight="medium" color="tertiary">
          Filter by
        </Typography>

        <div className={styles.filter}>
          <Dropdown>
            <Dropdown.Trigger asChild>
              <div className={styles.dropdownTrigger}>
                <Badge
                  color="brand"
                  size="md"
                  label={filterType === "app" ? "App" : "Keyshare Node"}
                />
                <ChevronDownIcon
                  color="var(--fg-tertiary)"
                  size={16}
                  className={styles.chevronIcon}
                />
              </div>
            </Dropdown.Trigger>
            <Dropdown.Content className={styles.dropdownContent}>
              <Dropdown.Item onClick={() => handleFilterTypeChange("app")}>
                <Typography size="sm" color="primary">
                  App
                </Typography>
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={() => handleFilterTypeChange("node")}>
                <Typography size="sm" color="primary">
                  Keyshare Node
                </Typography>
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown>

          <div className={styles.divider}>|</div>

          <Typography
            size="md"
            weight="medium"
            color="tertiary"
            className={styles.separatorText}
          >
            For
          </Typography>

          {filterType === "app" && (
            <Dropdown>
              <Dropdown.Trigger asChild>
                <div className={styles.dropdownTrigger}>
                  <Badge
                    color={selectedCustomerId ? "brand" : "gray"}
                    size="md"
                    label={
                      selectedCustomer ? selectedCustomer.customer.label : "All"
                    }
                  />
                  <ChevronDownIcon
                    color="var(--fg-tertiary)"
                    size={16}
                    className={styles.chevronIcon}
                  />
                </div>
              </Dropdown.Trigger>
              <Dropdown.Content className={styles.dropdownContent}>
                <Dropdown.Item onClick={() => handleCustomerChange(null)}>
                  <Typography size="sm" color="primary">
                    All
                  </Typography>
                </Dropdown.Item>
                <Dropdown.Divider />
                {customerData?.map((customer) => (
                  <Dropdown.Item
                    key={customer.customer.customer_id}
                    onClick={() =>
                      handleCustomerChange(customer.customer.customer_id)
                    }
                  >
                    <Typography size="sm" color="primary">
                      {customer.customer.label}
                    </Typography>
                  </Dropdown.Item>
                ))}
              </Dropdown.Content>
            </Dropdown>
          )}

          {filterType === "node" && (
            <Dropdown>
              <Dropdown.Trigger asChild>
                <div className={styles.dropdownTrigger}>
                  <Badge
                    color={selectedNodeId ? "brand" : "gray"}
                    size="md"
                    label={
                      selectedNodeId
                        ? nodeData?.ksNodes.find(
                            (n) => n.node_id === selectedNodeId,
                          )?.node_name || "All"
                        : "All"
                    }
                  />
                  <ChevronDownIcon
                    color="var(--fg-tertiary)"
                    size={16}
                    className={styles.chevronIcon}
                  />
                </div>
              </Dropdown.Trigger>
              <Dropdown.Content className={styles.dropdownContent}>
                <Dropdown.Item onClick={() => toggleKSNode("")}>
                  <Typography size="sm" color="primary">
                    All
                  </Typography>
                </Dropdown.Item>
                <Dropdown.Divider />
                {nodeData?.ksNodes
                  .filter((n) => n.status === "ACTIVE")
                  .map((node) => (
                    <Dropdown.Item
                      key={node.node_id}
                      onClick={() => toggleKSNode(node.node_id)}
                    >
                      <Typography size="sm" color="primary">
                        {node.node_name}
                      </Typography>
                    </Dropdown.Item>
                  ))}
              </Dropdown.Content>
            </Dropdown>
          )}

          <div className={styles.divider}>|</div>

          <Typography
            size="md"
            weight="medium"
            color="tertiary"
            className={styles.separatorText}
          >
            Curve
          </Typography>

          <Dropdown>
            <Dropdown.Trigger asChild>
              <div className={styles.dropdownTrigger}>
                <Badge
                  color={selectedCurveType ? "brand" : "gray"}
                  size="md"
                  label={selectedCurveType || "All"}
                />
                <ChevronDownIcon
                  color="var(--fg-tertiary)"
                  size={16}
                  className={styles.chevronIcon}
                />
              </div>
            </Dropdown.Trigger>
            <Dropdown.Content className={styles.dropdownContent}>
              <Dropdown.Item onClick={() => handleCurveTypeChange(null)}>
                <Typography size="sm" color="primary">
                  All
                </Typography>
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={() => handleCurveTypeChange("secp256k1")}>
                <Typography size="sm" color="primary">
                  secp256k1
                </Typography>
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleCurveTypeChange("ed25519")}>
                <Typography size="sm" color="primary">
                  ed25519
                </Typography>
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown>
        </div>
      </div>
      {tssSessions.length === 0 ? (
        <EmptyState text="No Sig History here yet." />
      ) : (
        <>
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
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className={styles.paginationWrapper}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrev || currentPage <= 1}
            >
              Prev
            </button>
            <span className={styles.pageInfo}>Page {currentPage}</span>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNext}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};
