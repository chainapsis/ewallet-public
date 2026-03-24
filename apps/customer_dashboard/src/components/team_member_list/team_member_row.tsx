"use client";

import { IconButton } from "@oko-wallet/oko-common-ui/icon_button";
import { DoorOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/door_outlined";
import { TrashIcon } from "@oko-wallet/oko-common-ui/icons/trash";
import { TableCell, TableRow } from "@oko-wallet/oko-common-ui/table";
import { Tooltip } from "@oko-wallet/oko-common-ui/tooltip";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./team_member_list.module.scss";
import type { TeamListItem } from "./types";

interface TeamMemberRowProps {
  member: TeamListItem;
  isAdmin: boolean;
  onLeave: () => void;
  onEditRole: (member: TeamListItem) => void;
  onRemove: (member: TeamListItem) => void;
  onResend: (member: TeamListItem) => void;
  onCancelInvite: (member: TeamListItem) => void;
}

const ShieldIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M6 1L2 2.8V5.6C2 8.12 3.708 10.468 6 11C8.292 10.468 10 8.12 10 5.6V2.8L6 1Z"
      stroke="var(--fg-quaternary)"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const UserEditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 22 20" fill="none">
    <path
      d="M8 13.5H6.5c-1.4 0-2.1 0-2.66.17A3.5 3.5 0 0 0 1.17 16.34C1 16.91 1 17.6 1 19M13.5 5.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 19l3.1-.89c.15-.04.22-.07.29-.1a1 1 0 0 0 .17-.07c.07-.04.12-.1.23-.2L20.25 11.25a1.77 1.77 0 0 0-2.5-2.5l-6.46 6.46c-.1.1-.16.16-.21.23a1 1 0 0 0-.07.17c-.03.07-.05.14-.1.3L10 19Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M7 9L14 2M7.14286 9.28571L9.14286 14.2857C9.28066 14.614 9.34957 14.7781 9.44843 14.8219C9.53467 14.8601 9.63429 14.8577 9.71857 14.8152C9.81486 14.7668 9.87657 14.5997 10 14.2657L14.3714 3.41429C14.4829 3.13714 14.5386 2.99857 14.5114 2.90857C14.488 2.83 14.4343 2.76571 14.3614 2.72943C14.2771 2.68857 14.1371 2.72571 13.8571 2.8L2.73429 6.55714C2.39543 6.66714 2.226 6.72214 2.17657 6.81571C2.13371 6.89714 2.13143 6.99429 2.17 7.07771C2.21429 7.17429 2.38029 7.23714 2.71229 7.36286L7.14286 9.28571Z"
      stroke="currentColor"
      strokeWidth="1.33"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const XCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M10 6L6 10M6 6L10 10M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33333 11.6819 1.33333 8C1.33333 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z"
      stroke="currentColor"
      strokeWidth="1.33"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MemberActions: FC<{
  member: TeamListItem;
  onLeave: () => void;
  onEditRole: () => void;
  onRemove: () => void;
  onResend: () => void;
  onCancelInvite: () => void;
}> = ({ member, onLeave, onEditRole, onRemove, onResend, onCancelInvite }) => {
  if (member.is_current_user) {
    return (
      <>
        <Tooltip
          title="Edit role"
          placement="top"
          hideFloatingArrow
          className={styles.tooltipWrapper}
        >
          <IconButton
            hierarchy="tertiary"
            size="xs"
            icon={<UserEditIcon />}
            onClick={onEditRole}
          />
        </Tooltip>
        <Tooltip
          title="Leave Team"
          placement="top"
          hideFloatingArrow
          className={styles.tooltipWrapper}
        >
          <IconButton
            hierarchy="tertiary"
            size="xs"
            icon={<DoorOutlinedIcon />}
            onClick={onLeave}
          />
        </Tooltip>
      </>
    );
  }

  if (member.status === "Invitation Pending") {
    return (
      <>
        <Tooltip
          title="Resend invite"
          placement="top"
          hideFloatingArrow
          className={styles.tooltipWrapper}
        >
          <IconButton
            hierarchy="tertiary"
            size="xs"
            icon={<SendIcon />}
            onClick={onResend}
          />
        </Tooltip>
        <Tooltip
          title="Cancel invite"
          placement="top"
          hideFloatingArrow
          className={styles.tooltipWrapper}
        >
          <IconButton
            hierarchy="tertiary"
            size="xs"
            icon={<XCircleIcon />}
            onClick={onCancelInvite}
          />
        </Tooltip>
      </>
    );
  }

  return (
    <>
      <Tooltip
        title="Edit role"
        placement="top"
        hideFloatingArrow
        className={styles.tooltipWrapper}
      >
        <IconButton
          hierarchy="tertiary"
          size="xs"
          icon={<UserEditIcon />}
          onClick={onEditRole}
        />
      </Tooltip>
      <Tooltip
        title="Remove"
        placement="top"
        hideFloatingArrow
        className={styles.tooltipWrapper}
      >
        <IconButton
          hierarchy="tertiary"
          size="xs"
          icon={<TrashIcon color="currentColor" size={16} />}
          onClick={onRemove}
        />
      </Tooltip>
    </>
  );
};

export const TeamMemberRow: FC<TeamMemberRowProps> = ({
  member,
  isAdmin,
  onLeave,
  onEditRole,
  onRemove,
  onResend,
  onCancelInvite,
}) => {
  const initial = member.email.charAt(0).toUpperCase();

  return (
    <TableRow>
      <TableCell>
        <div className={styles.emailCell}>
          <div className={styles.avatar}>{initial}</div>
          <Typography size="sm" weight="medium" color="primary">
            {member.email}
            {member.is_current_user && " (You)"}
          </Typography>
        </div>
      </TableCell>
      <TableCell>
        {member.role === "admin" ? (
          <span className={styles.roleBadge}>
            <ShieldIcon />
            Admin
          </span>
        ) : (
          <Typography size="sm" weight="regular" color="tertiary">
            Member
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <span className={styles.statusBadge}>
          <span
            className={
              member.status === "Active"
                ? styles.statusDotActive
                : styles.statusDotPending
            }
          />
          {member.status}
        </span>
      </TableCell>
      <TableCell className={styles.actionCell} align="right">
        {isAdmin ? (
          <div className={styles.adminActions}>
            <MemberActions
              member={member}
              onLeave={onLeave}
              onEditRole={() => onEditRole(member)}
              onRemove={() => onRemove(member)}
              onResend={() => onResend(member)}
              onCancelInvite={() => onCancelInvite(member)}
            />
          </div>
        ) : (
          member.is_current_user && (
            <Tooltip
              title="Leave Team"
              placement="top"
              hideFloatingArrow
              className={styles.tooltipWrapper}
            >
              <IconButton
                hierarchy="tertiary"
                size="xs"
                icon={<DoorOutlinedIcon />}
                onClick={onLeave}
              />
            </Tooltip>
          )
        )}
      </TableCell>
    </TableRow>
  );
};
