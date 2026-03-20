"use client";

import { IconButton } from "@oko-wallet/oko-common-ui/icon_button";
import { DoorOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/door_outlined";
import { TrashIcon } from "@oko-wallet/oko-common-ui/icons/trash";
import { TableCell, TableRow } from "@oko-wallet/oko-common-ui/table";
import { Tooltip } from "@oko-wallet/oko-common-ui/tooltip";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import type { TeamMember } from "./mock_data";
import styles from "./team_member_list.module.scss";

interface TeamMemberRowProps {
  member: TeamMember;
  isAdmin: boolean;
  onLeave: () => void;
  onEditRole: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
  onResend: (member: TeamMember) => void;
  onCancelInvite: (member: TeamMember) => void;
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
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 10H5.33333C4.09337 10 3.47339 10 2.98466 10.2027C2.34932 10.4638 1.84648 10.9667 1.58533 11.602C1.38266 12.0907 1.38266 12.7107 1.38266 13.9507M12.6667 12.6667L14 14M10.3333 4.33333C10.3333 5.806 9.13933 7 7.66667 7C6.194 7 5 5.806 5 4.33333C5 2.86067 6.194 1.66667 7.66667 1.66667C9.13933 1.66667 10.3333 2.86067 10.3333 4.33333ZM14 10.6667C14 11.7712 13.1046 12.6667 12 12.6667C10.8954 12.6667 10 11.7712 10 10.6667C10 9.56209 10.8954 8.66667 12 8.66667C13.1046 8.66667 14 9.56209 14 10.6667Z"
      stroke="currentColor"
      strokeWidth="1.33"
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
  member: TeamMember;
  onLeave: () => void;
  onEditRole: () => void;
  onRemove: () => void;
  onResend: () => void;
  onCancelInvite: () => void;
}> = ({ member, onLeave, onEditRole, onRemove, onResend, onCancelInvite }) => {
  if (member.is_me) {
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
            {member.is_me && " (You)"}
          </Typography>
        </div>
      </TableCell>
      <TableCell>
        {member.role === "Admin" ? (
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
          member.is_me && (
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
