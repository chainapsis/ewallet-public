"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import { LogOut04Icon } from "@oko-wallet/oko-common-ui/icons/log_out_04";
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
      d="M9 11.5004L11 13.5004L15.5 9.00036M20 12.0004C20 16.9088 14.646 20.4788 12.698 21.6152C12.4766 21.7444 12.3659 21.809 12.2097 21.8425C12.0884 21.8685 11.9116 21.8685 11.7903 21.8425C11.6341 21.809 11.5234 21.7444 11.302 21.6152C9.35396 20.4788 4 16.9088 4 12.0004V7.21796C4 6.41845 4 6.01869 4.13076 5.67506C4.24627 5.3715 4.43398 5.10064 4.67766 4.88589C4.9535 4.6428 5.3278 4.50243 6.0764 4.22171L11.4382 2.21103C11.6461 2.13307 11.75 2.09409 11.857 2.07864C11.9518 2.06493 12.0482 2.06493 12.143 2.07864C12.25 2.09409 12.3539 2.13307 12.5618 2.21103L17.9236 4.22171C18.6722 4.50243 19.0465 4.6428 19.3223 4.88589C19.566 5.10064 19.7537 5.3715 19.8692 5.67506C20 6.01869 20 6.41845 20 7.21796V12.0004Z"
      stroke="var(--fg-secondary)"
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
                <LogOut04Icon color="var(--fg-secondary)" />
              </div>
            </div>
            <div className={styles.textContent}>
              <Typography size="md" weight="semibold" color="primary">
                Are you sure you want to leave?
              </Typography>
              <Typography size="sm" weight="regular" color="tertiary">
                Your admin rights will be transferred to the selected user, and
                you will immediately lose access to this team.
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
