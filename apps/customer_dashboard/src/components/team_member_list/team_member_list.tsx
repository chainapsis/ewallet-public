"use client";

import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { ChevronLeftIcon } from "@oko-wallet/oko-common-ui/icons/chevron_left";
import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";
import { DoorOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/door_outlined";
import { SearchIcon } from "@oko-wallet/oko-common-ui/icons/search";
import { UsersIcon } from "@oko-wallet/oko-common-ui/icons/users";
import {
  Table,
  TableBody,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@oko-wallet/oko-common-ui/table";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import { type FC, useEffect, useMemo, useRef, useState } from "react";

import { LeaveTeamModal } from "./leave_team_modal";
import { MOCK_IS_ADMIN, MOCK_TEAM_MEMBERS, type TeamMember } from "./mock_data";
import styles from "./team_member_list.module.scss";
import { TeamMemberRow } from "./team_member_row";

type FilterTab = "all" | "admins" | "members" | "active" | "pending";

const ITEMS_PER_PAGE = 7;

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "admins", label: "Admins" },
  { key: "members", label: "Members" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
];

const filterMembers = (
  members: TeamMember[],
  filter: FilterTab,
  query: string,
): TeamMember[] => {
  let filtered = members;

  switch (filter) {
    case "admins":
      filtered = filtered.filter((m) => m.role === "Admin");
      break;
    case "members":
      filtered = filtered.filter((m) => m.role === "Member");
      break;
    case "active":
      filtered = filtered.filter((m) => m.status === "Active");
      break;
    case "pending":
      filtered = filtered.filter((m) => m.status === "Invitation Pending");
      break;
  }

  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter((m) =>
      m.email.toLowerCase().includes(lowerQuery),
    );
  }

  return filtered;
};

const getPageNumbers = (
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
};

const SortIcon = () => (
  <span className={styles.sortIconWrapper}>
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M3.5 4.5L6 2L8.5 4.5M3.5 7.5L6 10L8.5 7.5"
        stroke="var(--fg-quaternary)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

export const TeamMemberList: FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const isAdmin = MOCK_IS_ADMIN;
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pendingCount = useMemo(
    () =>
      MOCK_TEAM_MEMBERS.filter((m) => m.status === "Invitation Pending").length,
    [],
  );

  const filteredMembers = useMemo(
    () => filterMembers(MOCK_TEAM_MEMBERS, activeFilter, searchQuery),
    [activeFilter, searchQuery],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / ITEMS_PER_PAGE),
  );
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const handleFilterChange = (filter: FilterTab) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Typography
          tagType="h1"
          size="display-xs"
          weight="semibold"
          color="primary"
        >
          {"{dApp Name}"} Team
        </Typography>
        {isAdmin ? (
          <Button variant="primary" size="md">
            <UsersIcon color="currentColor" size={20} />
            Invite
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            className={styles.leaveTeamButton}
            onClick={() => setShowLeaveModal(true)}
          >
            <DoorOutlinedIcon color="currentColor" />
            Leave Team
          </Button>
        )}
      </div>

      <div className={styles.countAndSearch}>
        <Typography size="lg" weight="semibold" color="primary">
          {MOCK_TEAM_MEMBERS.length} Users
        </Typography>

        <div className={styles.searchWrapper}>
          <SearchIcon className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder={isAdmin ? "Search by email" : "Search email"}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <span className={styles.searchShortcut}>⌘K</span>
        </div>
      </div>

      <div>
        {!isAdmin && (
          <div className={styles.filterTabs}>
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={cn(styles.filterTab, {
                  [styles.filterTabActive]: activeFilter === filter.key,
                })}
                onClick={() => handleFilterChange(filter.key)}
              >
                {filter.label}
                {filter.key === "pending" && pendingCount > 0 && (
                  <Badge color="gray" label={String(pendingCount)} size="sm" />
                )}
              </button>
            ))}
          </div>
        )}

        {filteredMembers.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIllustration}>
              <svg width="120" height="120" viewBox="0 0 87 76" fill="none">
                <path
                  d="M47.54 73.87a28.48 28.48 0 0 1-8.42 0L3.76 64.84A4.25 4.25 0 0 1 .75 60.96V26.48c0-2.28 1.55-4.28 3.76-4.85l34.61-8.84a28.48 28.48 0 0 1 8.42 0l34.61 8.84a4.25 4.25 0 0 1 3.76 4.85v34.48a4.25 4.25 0 0 1-3.01 3.88L47.54 73.87Z"
                  fill="white"
                  stroke="var(--fg-primary)"
                  strokeWidth="1.5"
                />
                <path
                  d="M30.65 61.58v-2.06c0-1.92-1.2-3.86-2.83-4.75M24.51 41.69a7.1 7.1 0 0 1 2.36 4.45 7.1 7.1 0 0 1-2.36 3.19M25.93 60.32c0-1.92 0-2.88-.29-3.71a5.56 5.56 0 0 0-2.05-2.78c-.69-.5-1.57-.74-3.33-1.21l-2.84-.76c-1.76-.47-2.64-.71-3.34-.58a3.37 3.37 0 0 0-2.05 1.68c-.29.68-.29 1.64-.29 3.56M22.62 45.01c0 2.27-1.69 3.67-3.78 3.11-2.09-.56-3.78-2.86-3.78-5.13 0-2.28 1.69-3.67 3.78-3.11 2.09.56 3.78 2.86 3.78 5.13Z"
                  stroke="var(--fg-quaternary)"
                  strokeWidth="1.67"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M47.26 33.41a28.48 28.48 0 0 1-7.85 0L5.7 25.41c-1.01-.24-1.03-1.67-.03-1.94l33.24-8.95a28.48 28.48 0 0 1 8.84 0l33.24 8.95c1 .27.98 1.7-.03 1.94l-33.71 7.99Z"
                  stroke="var(--fg-primary)"
                  strokeWidth="1.5"
                />
                <path
                  d="M41.39.75c17.26 0 31.24 4.7 31.24 10.49v7.19c0 .1 0 .2-.01.3 0 5.79-13.99 10.49-31.24 10.49-17.26 0-31.24-4.7-31.24-10.49 0-.1 0-.2.01-.3h-.01v-7.19C10.15 5.45 24.14.75 41.39.75Z"
                  fill="white"
                  stroke="var(--fg-primary)"
                  strokeWidth="1.5"
                />
                <ellipse
                  cx="41.39"
                  cy="10.98"
                  rx="28.48"
                  ry="8.02"
                  fill="white"
                  stroke="var(--fg-primary)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M50.64 21.79a5.25 5.25 0 0 1 3.65 1.24l21.14 20.38c2.75 2.65 1.17 7.31-2.62 7.75a5.25 5.25 0 0 1-3.65-1.24L48.02 29.53c-2.75-2.65-1.17-7.31 2.62-7.75Z"
                  fill="white"
                  stroke="var(--fg-primary)"
                  strokeWidth="1.5"
                />
                <path
                  d="M43.33 40.01v29.86"
                  stroke="var(--fg-primary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className={styles.emptyText}>
              <Typography size="md" weight="semibold" color="primary">
                No users found
              </Typography>
              <Typography size="sm" weight="regular" color="tertiary">
                Your search &ldquo;{searchQuery}&rdquo; did not match any users.
              </Typography>
            </div>
          </div>
        ) : (
          <Table noWrap className={styles.table}>
            <TableHead className={styles.tableHead}>
              <TableRow>
                <TableHeaderCell className={styles.emailColumn}>
                  <div className={styles.sortableHeader}>
                    Email
                    <SortIcon />
                  </div>
                </TableHeaderCell>
                <TableHeaderCell className={styles.roleColumn}>
                  <div className={styles.sortableHeader}>
                    Role
                    <SortIcon />
                  </div>
                </TableHeaderCell>
                <TableHeaderCell className={styles.statusColumn}>
                  <div className={styles.sortableHeader}>
                    Status
                    <SortIcon />
                  </div>
                </TableHeaderCell>
                <TableHeaderCell className={styles.actionCell} />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedMembers.map((member) => (
                <TeamMemberRow
                  key={member.user_id}
                  member={member}
                  isAdmin={isAdmin}
                  onLeave={() => setShowLeaveModal(true)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && filteredMembers.length > 0 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.paginationButton}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeftIcon size={20} color="currentColor" />
            Previous
          </button>

          <div className={styles.pageNumbers}>
            {pageNumbers.map((page, i) =>
              page === "ellipsis" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis items have no unique id
                <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  className={cn(styles.pageNumber, {
                    [styles.pageNumberActive]: currentPage === page,
                  })}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            className={styles.paginationButton}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
            <ChevronRightIcon size={20} color="currentColor" />
          </button>
        </div>
      )}
      {showLeaveModal && (
        <LeaveTeamModal
          onLeave={() => setShowLeaveModal(false)}
          onClose={() => setShowLeaveModal(false)}
        />
      )}
    </div>
  );
};
