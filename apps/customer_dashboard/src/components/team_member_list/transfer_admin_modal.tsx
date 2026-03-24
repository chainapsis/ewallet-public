"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import { DoorOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/door_outlined";
import { SearchIcon } from "@oko-wallet/oko-common-ui/icons/search";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import { type FC, useMemo, useRef, useState } from "react";

import { IconPattern } from "./icon_pattern";
import inviteStyles from "./invite_modal.module.scss";
import styles from "./leave_team_modal.module.scss";
import transferStyles from "./transfer_admin_modal.module.scss";
import type { TeamListItem } from "./types";

interface TransferAdminModalProps {
  members: TeamListItem[];
  onTransfer: (member: TeamListItem) => void;
  onClose: () => void;
}

const TransferIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M19 21L16 18M16 18L19 15M16 18H22M12 15.5H7.5C6.10444 15.5 5.40665 15.5 4.83886 15.6722C3.56045 16.06 2.56004 17.0605 2.17224 18.3389C2 18.9067 2 19.6044 2 21M14.5 7.5C14.5 9.98528 12.4853 12 10 12C7.51472 12 5.5 9.98528 5.5 7.5C5.5 5.01472 7.51472 3 10 3C12.4853 3 14.5 5.01472 14.5 7.5Z"
      stroke="var(--fg-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UserSmallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M16.67 17.5c0-1.39 0-2.08-.27-2.63a2.5 2.5 0 0 0-1.09-1.1c-.55-.27-1.24-.27-2.63-.27H7.33c-1.39 0-2.08 0-2.63.27a2.5 2.5 0 0 0-1.1 1.1c-.27.55-.27 1.24-.27 2.63M13.33 6.25a3.33 3.33 0 1 1-6.66 0 3.33 3.33 0 0 1 6.66 0Z"
      stroke="var(--fg-quaternary)"
      strokeWidth="1.67"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M16.67 5L7.5 14.17 3.33 10"
      stroke="var(--fg-primary)"
      strokeWidth="1.67"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type Step = "select" | "confirm";

export const TransferAdminModal: FC<TransferAdminModalProps> = ({
  members,
  onTransfer,
  onClose,
}) => {
  const [step, setStep] = useState<Step>("select");
  const [selectedMember, setSelectedMember] = useState<TeamListItem | null>(
    null,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mouseDownOnOverlay = useRef(false);

  const otherMembers = useMemo(
    () => members.filter((m) => !m.is_current_user && m.status === "Active"),
    [members],
  );

  const filteredDropdownMembers = useMemo(() => {
    if (!searchQuery) {
      return otherMembers;
    }
    const q = searchQuery.toLowerCase();
    return otherMembers.filter((m) => m.email.toLowerCase().includes(q));
  }, [otherMembers, searchQuery]);

  const handleSelectMember = (member: TeamListItem) => {
    setSelectedMember(member);
    setDropdownOpen(false);
    setSearchQuery("");
  };

  const handleNext = () => {
    if (selectedMember) {
      setStep("confirm");
    }
  };

  if (step === "confirm" && selectedMember) {
    const initial = selectedMember.email.charAt(0).toUpperCase();
    return (
      <div
        className={styles.overlay}
        onMouseDown={(e) => {
          mouseDownOnOverlay.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && mouseDownOnOverlay.current) {
            onClose();
          }
          mouseDownOnOverlay.current = false;
        }}
      >
        <div className={styles.modal}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <XCloseIcon color="var(--fg-quaternary)" size={24} />
          </button>

          <div className={styles.content}>
            <div className={styles.iconContainer}>
              <IconPattern className={styles.iconPattern} />
              <div className={styles.iconWrapper}>
                <DoorOutlinedIcon color="var(--fg-primary)" />
              </div>
            </div>
            <div className={styles.textContent}>
              <Typography size="md" weight="semibold" color="primary">
                Are you sure you want to leave?
              </Typography>
              <Typography size="sm" weight="regular" color="tertiary">
                The admin role will be transferred to this user immediately and
                you will leave the team.
              </Typography>
            </div>
          </div>

          <div className={transferStyles.confirmBody}>
            <Typography size="sm" weight="medium" color="secondary">
              Transfer to
            </Typography>
            <div className={inviteStyles.memberInfo}>
              <div className={inviteStyles.memberAvatar}>{initial}</div>
              <Typography size="sm" weight="medium" color="primary">
                {selectedMember.email}
              </Typography>
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" size="md" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => onTransfer(selectedMember)}
            >
              Leave
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        mouseDownOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownOnOverlay.current) {
          onClose();
        }
        mouseDownOnOverlay.current = false;
      }}
    >
      <div
        className={cn(styles.modal, {
          [transferStyles.transferModalOpen]: dropdownOpen,
        })}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          <XCloseIcon color="var(--fg-quaternary)" size={24} />
        </button>

        <div className={styles.content}>
          <div className={styles.iconContainer}>
            <IconPattern className={styles.iconPattern} />
            <div className={styles.iconWrapper}>
              <TransferIcon />
            </div>
          </div>
          <div className={styles.textContent}>
            <Typography size="md" weight="semibold" color="primary">
              Transfer admin role
            </Typography>
            <Typography size="sm" weight="regular" color="tertiary">
              You're the only admin on this team. Assign a new admin before you
              leave.
            </Typography>
          </div>
        </div>

        <div className={styles.body}>
          <Typography size="sm" weight="medium" color="secondary">
            Transfer to
          </Typography>

          <div className={transferStyles.dropdownWrapper}>
            <button
              type="button"
              className={transferStyles.dropdownTrigger}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <UserSmallIcon />
              <span
                className={cn(transferStyles.dropdownText, {
                  [transferStyles.dropdownPlaceholder]: !selectedMember,
                })}
              >
                {selectedMember ? selectedMember.email : "Select team member"}
              </span>
              <ChevronDownIcon
                size={20}
                color="var(--fg-quaternary)"
                className={cn(transferStyles.chevron, {
                  [transferStyles.chevronOpen]: dropdownOpen,
                })}
              />
            </button>

            {dropdownOpen && (
              <div className={transferStyles.dropdown}>
                <div className={transferStyles.dropdownSearch}>
                  <SearchIcon />
                  <input
                    type="text"
                    className={transferStyles.dropdownSearchInput}
                    placeholder="Search by email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    // biome-ignore lint/a11y/noAutofocus: dropdown search should auto-focus
                    autoFocus
                  />
                </div>
                <div className={transferStyles.dropdownList}>
                  {filteredDropdownMembers.length === 0 ? (
                    <div className={transferStyles.dropdownEmpty}>
                      <Typography size="sm" weight="regular" color="tertiary">
                        No user found with that email
                      </Typography>
                    </div>
                  ) : (
                    filteredDropdownMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className={transferStyles.dropdownItem}
                        onClick={() => handleSelectMember(member)}
                      >
                        <UserSmallIcon />
                        <Typography size="sm" weight="regular" color="primary">
                          {member.email}
                        </Typography>
                        {selectedMember?.id === member.id && (
                          <span className={transferStyles.checkIcon}>
                            <CheckIcon />
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="md" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleNext}
            disabled={!selectedMember}
          >
            Transfer &amp; Leave
          </Button>
        </div>
      </div>
    </div>
  );
};
