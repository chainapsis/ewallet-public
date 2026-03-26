"use client";

import { Badge } from "@oko-wallet/oko-common-ui/badge";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { ChevronLeftIcon } from "@oko-wallet/oko-common-ui/icons/chevron_left";
import { ChevronRightIcon } from "@oko-wallet/oko-common-ui/icons/chevron_right";
import { DoorOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/door_outlined";
import { SearchIcon } from "@oko-wallet/oko-common-ui/icons/search";
import { UserPlusIcon } from "@oko-wallet/oko-common-ui/icons/user_plus";
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

import { CancelInviteModal } from "./cancel_invite_modal";
import { EditRoleModal } from "./edit_role_modal";
import { InviteModal } from "./invite_modal";
import { LeaveTeamModal } from "./leave_team_modal";
import { RemoveMemberModal } from "./remove_member_modal";
import { ResendInviteModal } from "./resend_invite_modal";
import styles from "./team_member_list.module.scss";
import { TeamMemberRow } from "./team_member_row";
import { TransferAdminModal } from "./transfer_admin_modal";
import {
  invitationsToListItems,
  membersToListItems,
  type TeamListItem,
} from "./types";
import { displayToast } from "@oko-wallet-ct-dashboard/components/toast";
import {
  requestCancelInvitation,
  requestInviteTeamMember,
  requestLeaveTeam,
  requestRemoveTeamMember,
  requestResendInvitation,
  requestUpdateMemberRole,
} from "@oko-wallet-ct-dashboard/fetch/team";
import {
  useInvalidateTeamMembers,
  useTeamMembers,
} from "@oko-wallet-ct-dashboard/hooks/use_team_members";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

type FilterTab = "all" | "admins" | "members" | "active" | "pending";

const ITEMS_PER_PAGE = 7;

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "admins", label: "Admins" },
  { key: "members", label: "Members" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
];

const filterItems = (
  items: TeamListItem[],
  filter: FilterTab,
  query: string,
): TeamListItem[] => {
  let filtered = items;

  switch (filter) {
    case "admins":
      filtered = filtered.filter((m) => m.role === "admin");
      break;
    case "members":
      filtered = filtered.filter((m) => m.role === "member");
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

const sortItems = (
  items: TeamListItem[],
  column: string | null,
  direction: "asc" | "desc" | null,
): TeamListItem[] => {
  if (!column || !direction) {
    return [...items].sort((a, b) => {
      if (a.is_current_user && !b.is_current_user) {
        return -1;
      }
      if (!a.is_current_user && b.is_current_user) {
        return 1;
      }
      const roleOrder = { admin: 0, member: 1 };
      const roleDiff = roleOrder[a.role] - roleOrder[b.role];
      if (roleDiff !== 0) {
        return roleDiff;
      }
      return a.email.localeCompare(b.email);
    });
  }

  const multiplier = direction === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    switch (column) {
      case "email":
        return a.email.localeCompare(b.email) * multiplier;
      case "role": {
        const roleOrder = { admin: 0, member: 1 };
        return (roleOrder[a.role] - roleOrder[b.role]) * multiplier;
      }
      case "status": {
        const statusOrder = { Active: 0, "Invitation Pending": 1 };
        return (statusOrder[a.status] - statusOrder[b.status]) * multiplier;
      }
      default:
        return 0;
    }
  });
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

type SortDirection = "asc" | "desc" | null;

const SortIcon: FC<{ direction: SortDirection }> = ({ direction }) => (
  <span className={styles.sortIconWrapper}>
    {direction === "asc" ? (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 10V2M6 2L3 5M6 2L9 5"
          stroke="var(--fg-primary)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : direction === "desc" ? (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 2V10M6 10L3 7M6 10L9 7"
          stroke="var(--fg-primary)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M3.5 4.5L6 2L8.5 4.5M3.5 7.5L6 10L8.5 7.5"
          stroke="var(--fg-quaternary)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </span>
);

export const TeamMemberList: FC = () => {
  const token = useAppState((s) => s.token);
  const { data: teamData, isLoading: loading } = useTeamMembers();
  const invalidateTeamMembers = useInvalidateTeamMembers();

  const allItems = useMemo(() => {
    if (!teamData) {
      return [];
    }
    return [
      ...membersToListItems(teamData.members),
      ...invitationsToListItems(teamData.pending_invitations),
    ];
  }, [teamData]);

  const teamName = teamData?.team_name ?? "";

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editRoleMember, setEditRoleMember] = useState<TeamListItem | null>(
    null,
  );
  const [removeMember, setRemoveMember] = useState<TeamListItem | null>(null);
  const [resendMember, setResendMember] = useState<TeamListItem | null>(null);
  const [cancelInviteMember, setCancelInviteMember] =
    useState<TeamListItem | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const currentUser = useMemo(
    () => allItems.find((m) => m.is_current_user),
    [allItems],
  );
  const isAdmin = currentUser?.role === "admin";
  const adminCount = useMemo(
    () =>
      allItems.filter((m) => m.role === "admin" && m.status === "Active")
        .length,
    [allItems],
  );
  const isSoleAdmin = isAdmin && adminCount === 1;
  const isSoleMember =
    allItems.filter((m) => m.status === "Active").length === 1;

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const getSortDirection = (column: string): SortDirection =>
    sortColumn === column ? sortDirection : null;

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
    () => allItems.filter((m) => m.status === "Invitation Pending").length,
    [allItems],
  );

  const filteredMembers = useMemo(
    () =>
      sortItems(
        filterItems(allItems, activeFilter, searchQuery),
        sortColumn,
        sortDirection,
      ),
    [allItems, activeFilter, searchQuery, sortColumn, sortDirection],
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

  // ─── Modal callbacks (API-connected) ────────────────────────────

  const handleInvite = async (email: string, role: "Admin" | "Member") => {
    if (!token) {
      return;
    }
    const existing = allItems.find(
      (m) => m.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (existing) {
      displayToast({
        variant: "error",
        title:
          existing.status === "Invitation Pending"
            ? "An invitation has already been sent to this user"
            : "The user already exists",
      });
      return;
    }
    const res = await requestInviteTeamMember({
      token,
      email,
      role: role === "Admin" ? "admin" : "member",
    });
    if (res.success) {
      setShowInviteModal(false);
      displayToast({
        variant: "success",
        title: "The invitation has been sent",
      });
      invalidateTeamMembers();
    } else {
      displayToast({ variant: "error", title: res.msg });
    }
  };

  const handleEditRole = async (role: "Admin" | "Member") => {
    if (!token || !editRoleMember) {
      return;
    }
    const res = await requestUpdateMemberRole({
      token,
      user_id: editRoleMember.id,
      role: role === "Admin" ? "admin" : "member",
    });
    if (res.success) {
      setEditRoleMember(null);
      displayToast({ variant: "success", title: "The role has been updated" });
      invalidateTeamMembers();
    } else {
      displayToast({ variant: "error", title: res.msg });
    }
  };

  const handleRemove = async () => {
    if (!token || !removeMember) {
      return;
    }
    const res = await requestRemoveTeamMember({
      token,
      user_id: removeMember.id,
    });
    if (res.success) {
      setRemoveMember(null);
      displayToast({ variant: "success", title: "User has been removed" });
      invalidateTeamMembers();
    } else {
      displayToast({ variant: "error", title: res.msg });
    }
  };

  const handleResend = async () => {
    if (!token || !resendMember?.invitation_id) {
      return;
    }
    const res = await requestResendInvitation({
      token,
      invitation_id: resendMember.invitation_id,
    });
    if (res.success) {
      setResendMember(null);
      displayToast({ variant: "success", title: "Invitation resent" });
      invalidateTeamMembers();
    } else {
      displayToast({ variant: "error", title: res.msg });
    }
  };

  const handleCancelInvite = async () => {
    if (!token || !cancelInviteMember?.invitation_id) {
      return;
    }
    const res = await requestCancelInvitation({
      token,
      invitation_id: cancelInviteMember.invitation_id,
    });
    if (res.success) {
      setCancelInviteMember(null);
      displayToast({
        variant: "success",
        title: "Invitation has been canceled",
      });
      invalidateTeamMembers();
    } else {
      displayToast({ variant: "error", title: res.msg });
    }
  };

  const handleLeave = async () => {
    if (!token) {
      return;
    }
    const res = await requestLeaveTeam({ token });
    if (res.success) {
      setShowLeaveModal(false);
      displayToast({ variant: "success", title: "You have left the team" });
      setTimeout(() => {
        useAppState.getState().resetUser();
      }, 1500);
    } else {
      displayToast({ variant: "error", title: res.msg });
    }
  };

  const handleTransfer = async (targetMember: TeamListItem) => {
    if (!token) {
      return;
    }
    const res = await requestLeaveTeam({
      token,
      target_user_id: targetMember.id,
    });
    if (res.success) {
      setShowTransferModal(false);
      displayToast({
        variant: "success",
        title: "Admin role transferred. You have left the team.",
      });
      setTimeout(() => {
        useAppState.getState().resetUser();
      }, 1500);
    } else {
      displayToast({ variant: "error", title: res.msg });
    }
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <Typography size="md" weight="regular" color="tertiary">
          Loading...
        </Typography>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Typography
          tagType="h1"
          size="display-xs"
          weight="semibold"
          color="primary"
        >
          {teamName || "Team"}
        </Typography>
        {isAdmin ? (
          <button
            type="button"
            className={styles.inviteButton}
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlusIcon color="var(--brand-300)" size={20} />
            Invite
          </button>
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
          {allItems.length} {allItems.length === 1 ? "User" : "Users"}
        </Typography>

        <div className={styles.searchWrapper}>
          <SearchIcon className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder={isAdmin ? "Search by email" : "Search email"}
            autoComplete="off"
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
                {searchQuery ? (
                  <>
                    Your search &ldquo;{searchQuery}&rdquo; did not match any
                    users.
                  </>
                ) : (
                  "No users match the selected filter."
                )}
              </Typography>
            </div>
          </div>
        ) : (
          <Table noWrap className={styles.table}>
            <TableHead className={styles.tableHead}>
              <TableRow>
                <TableHeaderCell
                  className={styles.emailColumn}
                  onClick={() => handleSort("email")}
                >
                  <div className={styles.sortableHeader}>
                    Email
                    <SortIcon direction={getSortDirection("email")} />
                  </div>
                </TableHeaderCell>
                <TableHeaderCell
                  className={styles.roleColumn}
                  onClick={() => handleSort("role")}
                >
                  <div className={styles.sortableHeader}>
                    Role
                    <SortIcon direction={getSortDirection("role")} />
                  </div>
                </TableHeaderCell>
                <TableHeaderCell
                  className={styles.statusColumn}
                  onClick={() => handleSort("status")}
                >
                  <div className={styles.sortableHeader}>
                    Status
                    <SortIcon direction={getSortDirection("status")} />
                  </div>
                </TableHeaderCell>
                <TableHeaderCell className={styles.actionCell} />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedMembers.map((member) => (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  isAdmin={isAdmin}
                  onLeave={() => {
                    if (isSoleMember) {
                      setShowLeaveModal(true);
                    } else if (isSoleAdmin) {
                      setShowTransferModal(true);
                    } else {
                      setShowLeaveModal(true);
                    }
                  }}
                  onEditRole={setEditRoleMember}
                  onRemove={setRemoveMember}
                  onResend={setResendMember}
                  onCancelInvite={setCancelInviteMember}
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
          isSoleMember={isSoleMember}
          hasPendingInvitations={pendingCount > 0}
          onLeave={handleLeave}
          onClose={() => setShowLeaveModal(false)}
        />
      )}
      {showInviteModal && (
        <InviteModal
          onInvite={handleInvite}
          onClose={() => setShowInviteModal(false)}
        />
      )}
      {editRoleMember && (
        <EditRoleModal
          member={editRoleMember}
          onUpdate={handleEditRole}
          onClose={() => setEditRoleMember(null)}
        />
      )}
      {removeMember && (
        <RemoveMemberModal
          member={removeMember}
          onRemove={handleRemove}
          onClose={() => setRemoveMember(null)}
        />
      )}
      {resendMember && (
        <ResendInviteModal
          member={resendMember}
          onResend={handleResend}
          onClose={() => setResendMember(null)}
        />
      )}
      {showTransferModal && (
        <TransferAdminModal
          members={allItems}
          onTransfer={handleTransfer}
          onClose={() => setShowTransferModal(false)}
        />
      )}
      {cancelInviteMember && (
        <CancelInviteModal
          member={cancelInviteMember}
          onCancelInvite={handleCancelInvite}
          onClose={() => setCancelInviteMember(null)}
        />
      )}
    </div>
  );
};
