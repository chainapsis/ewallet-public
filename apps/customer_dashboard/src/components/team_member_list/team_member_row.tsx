"use client";

import { IconButton } from "@oko-wallet/oko-common-ui/icon_button";
import { UserRightIcon } from "@oko-wallet/oko-common-ui/icons/user_right";
import { TableCell, TableRow } from "@oko-wallet/oko-common-ui/table";
import { Tooltip } from "@oko-wallet/oko-common-ui/tooltip";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./team_member_list.module.scss";
import type { TeamListItem } from "./types";

interface TeamMemberRowProps {
  member: TeamListItem;
  isAdmin: boolean;
  isSoleAdmin: boolean;
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

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M6 2H10M2 4H14M12.6667 4L12.1991 11.0129C12.129 12.065 12.0939 12.5911 11.8667 12.99C11.6666 13.3412 11.3648 13.6235 11.0011 13.7998C10.588 14 10.0607 14 9.00623 14H6.99377C5.93927 14 5.41202 14 4.99889 13.7998C4.63517 13.6235 4.33339 13.3412 4.13332 12.99C3.90607 12.5911 3.871 12.065 3.80086 11.0129L3.33333 4M6.66667 7V10.3333M9.33333 7V10.3333"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M6.99964 9.00005L13.9996 2.00005M7.08469 9.21876L8.83677 13.7241C8.99112 14.121 9.06829 14.3194 9.17949 14.3774C9.27589 14.4276 9.39073 14.4277 9.48719 14.3776C9.59846 14.3198 9.67586 14.1214 9.83068 13.7247L14.2242 2.46619C14.364 2.10807 14.4339 1.92901 14.3956 1.81459C14.3625 1.71522 14.2845 1.63724 14.1851 1.60405C14.0707 1.56582 13.8916 1.6357 13.5335 1.77545L2.27501 6.16902C1.8783 6.32383 1.67994 6.40124 1.62213 6.51251C1.57202 6.60897 1.57209 6.7238 1.62231 6.8202C1.68025 6.9314 1.8787 7.00858 2.27559 7.16293L6.78093 8.915C6.8615 8.94633 6.90178 8.962 6.9357 8.98619C6.96576 9.00764 6.99206 9.03393 7.0135 9.06399C7.0377 9.09792 7.05336 9.1382 7.08469 9.21876Z"
      stroke="currentColor"
      strokeWidth="1.5"
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
  isSoleAdmin: boolean;
  onLeave: () => void;
  onEditRole: () => void;
  onRemove: () => void;
  onResend: () => void;
  onCancelInvite: () => void;
}> = ({
  member,
  isSoleAdmin,
  onLeave,
  onEditRole,
  onRemove,
  onResend,
  onCancelInvite,
}) => {
  if (member.is_current_user) {
    return (
      <>
        {!isSoleAdmin && (
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
        )}
        <Tooltip
          title="Leave Team"
          placement="top"
          hideFloatingArrow
          className={styles.tooltipWrapper}
        >
          <IconButton
            hierarchy="tertiary"
            size="xs"
            icon={<UserRightIcon />}
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
          icon={<TrashIcon />}
          onClick={onRemove}
        />
      </Tooltip>
    </>
  );
};

export const TeamMemberRow: FC<TeamMemberRowProps> = ({
  member,
  isAdmin,
  isSoleAdmin,
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
              isSoleAdmin={isSoleAdmin}
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
                icon={<UserRightIcon />}
                onClick={onLeave}
              />
            </Tooltip>
          )
        )}
      </TableCell>
    </TableRow>
  );
};
