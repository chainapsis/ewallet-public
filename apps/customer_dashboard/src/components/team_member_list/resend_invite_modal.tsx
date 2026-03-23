"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useCallback, useEffect, useRef, useState } from "react";

import { IconPattern } from "./icon_pattern";
import inviteStyles from "./invite_modal.module.scss";
import styles from "./leave_team_modal.module.scss";
import type { TeamListItem } from "./types";

const COOLDOWN_MS = 5 * 60 * 1000;

function getRemainingSeconds(lastSentAt: string | null | undefined): number {
  if (!lastSentAt) {
    return 0;
  }
  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  const remaining = COOLDOWN_MS - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface ResendInviteModalProps {
  member: TeamListItem;
  onResend: () => void;
  onClose: () => void;
}

const SendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M10.4995 13.5002L20.9995 3.00017M10.6271 13.8282L13.2552 20.5862C13.4867 21.1816 13.6025 21.4793 13.7693 21.5662C13.9139 21.6415 14.0862 21.6416 14.2308 21.5664C14.3977 21.4797 14.5139 21.1822 14.7461 20.5871L21.3364 3.69937C21.5461 3.16219 21.6509 2.8936 21.5935 2.72197C21.5437 2.57292 21.4268 2.45596 21.2777 2.40616C21.1061 2.34883 20.8375 2.45364 20.3003 2.66327L3.41258 9.25361C2.8175 9.48584 2.51997 9.60195 2.43326 9.76886C2.35809 9.91354 2.35819 10.0858 2.43353 10.2304C2.52043 10.3972 2.81811 10.513 3.41345 10.7445L10.1715 13.3726C10.2923 13.4196 10.3527 13.4431 10.4036 13.4794C10.4487 13.5115 10.4881 13.551 10.5203 13.5961C10.5566 13.647 10.5801 13.7074 10.6271 13.8282Z"
      stroke="var(--fg-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ResendInviteModal: FC<ResendInviteModalProps> = ({
  member,
  onResend,
  onClose,
}) => {
  const mouseDownOnOverlay = useRef(false);
  const initial = member.email.charAt(0).toUpperCase();

  const [remaining, setRemaining] = useState(() =>
    getRemainingSeconds(member.last_sent_at),
  );

  const tick = useCallback(() => {
    setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      return;
    }
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [remaining, tick]);

  const isCooldown = remaining > 0;

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
              <SendIcon />
            </div>
          </div>
          <div className={styles.textContent}>
            <Typography size="md" weight="semibold" color="primary">
              Re-send the invitation
            </Typography>
            <Typography size="sm" weight="regular" color="tertiary">
              Resend available every 5 minutes.
            </Typography>
          </div>
        </div>

        <div className={styles.body}>
          <div className={inviteStyles.memberInfo}>
            <div className={inviteStyles.memberAvatar}>{initial}</div>
            <Typography size="sm" weight="medium" color="primary">
              {member.email}
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
            onClick={onResend}
            disabled={isCooldown}
          >
            {isCooldown ? `Resend in ${formatTime(remaining)}` : "Resend"}
          </Button>
        </div>
      </div>
    </div>
  );
};
