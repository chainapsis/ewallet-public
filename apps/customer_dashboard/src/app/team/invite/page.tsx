"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { EyeIcon } from "@oko-wallet/oko-common-ui/icons/eye";
import { EyeOffIcon } from "@oko-wallet/oko-common-ui/icons/eye_off";
import { Input } from "@oko-wallet/oko-common-ui/input";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import styles from "./page.module.scss";
import { DashboardHeader } from "@oko-wallet-ct-dashboard/components/dashboard_header/dashboard_header";
import {
  PASSWORD_CONTAINS_NUMBER_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@oko-wallet-ct-dashboard/constants";
import {
  requestAcceptInvitation,
  requestValidateInvitation,
} from "@oko-wallet-ct-dashboard/fetch/team";
import { paths } from "@oko-wallet-ct-dashboard/paths";

type PageState = "loading" | "form" | "invalid";

interface InvitationInfo {
  email: string;
  role: string;
  team_name: string;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateToken = useCallback(async () => {
    if (!token) {
      setPageState("invalid");
      return;
    }

    const res = await requestValidateInvitation({ token });
    if (res.success) {
      setInvitationInfo(res.data);
      setPageState("form");
    } else {
      setPageState("invalid");
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const validatePassword = (): string | null => {
    if (password.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
    }
    if (!PASSWORD_CONTAINS_NUMBER_REGEX.test(password)) {
      return "Password must include at least one number";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!token) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    const res = await requestAcceptInvitation({ token, password });
    if (res.success) {
      router.push(paths.team_invite_success);
    } else {
      setError(res.msg);
      setIsSubmitting(false);
    }
  };

  if (pageState === "loading") {
    return (
      <div className={styles.wrapper}>
        <DashboardHeader />
        <div className={styles.loadingBody}>
          <svg
            className={styles.spinner}
            width="32"
            height="32"
            viewBox="0 0 62 62"
            fill="none"
          >
            <path
              d="M58.125 31C58.125 34.5621 57.4234 38.0893 56.0602 41.3803C54.6971 44.6712 52.6991 47.6615 50.1803 50.1803C47.6615 52.6991 44.6712 54.6971 41.3803 56.0602C38.0893 57.4234 34.5621 58.125 31 58.125C27.4379 58.125 23.9107 57.4234 20.6197 56.0602C17.3288 54.6971 14.3385 52.6991 11.8197 50.1803C9.30094 47.6615 7.30292 44.6712 5.93977 41.3803C4.57661 38.0893 3.875 34.5621 3.875 31C3.875 27.4379 4.57661 23.9107 5.93977 20.6197C7.30293 17.3287 9.30095 14.3385 11.8197 11.8197C14.3385 9.30093 17.3288 7.30292 20.6197 5.93976C23.9107 4.57661 27.4379 3.875 31 3.875C34.5621 3.875 38.0893 4.57661 41.3803 5.93977C44.6713 7.30293 47.6615 9.30095 50.1803 11.8197C52.6991 14.3385 54.6971 17.3288 56.0602 20.6197C57.4234 23.9107 58.125 27.4379 58.125 31Z"
              stroke="var(--bg-tertiary, #e9eaeb)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M31 3.875C34.5621 3.875 38.0893 4.57661 41.3803 5.93977C44.6713 7.30293 47.6615 9.30094 50.1803 11.8197C52.6991 14.3385 54.6971 17.3288 56.0602 20.6197C57.4234 23.9107 58.125 27.4379 58.125 31"
              stroke="var(--fg-primary, #181d27)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    router.replace(paths.team_invite_invalid);
    return null;
  }

  const teamName = invitationInfo?.team_name ?? "the team";
  const isFormValid = password.length > 0 && confirmPassword.length > 0;

  return (
    <div className={styles.wrapper}>
      <DashboardHeader />
      <div className={styles.body}>
        <div className={styles.formContainer}>
          <Spacing height={24} />

          <Typography
            tagType="h1"
            size="display-sm"
            weight="semibold"
            color="primary"
          >
            Welcome to the
            <br />
            {teamName} Team 👋
          </Typography>

          <Spacing height={12} />

          <Typography size="md" weight="medium" color="secondary">
            Create your password to begin.
          </Typography>

          <Spacing height={40} />

          <form onSubmit={handleSubmit}>
            <Input
              label="Enter your password"
              placeholder="Enter new password"
              requiredSymbol
              type={showPassword ? "text" : "password"}
              maxLength={16}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              helpText="Password must be 8–16 characters and must include numbers."
              fullWidth
              SideComponent={
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              }
            />

            <Spacing height={28} />

            <Input
              label="Confirm your password"
              placeholder="Confirm password"
              requiredSymbol
              type={showConfirmPassword ? "text" : "password"}
              maxLength={16}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              fullWidth
              SideComponent={
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              }
            />

            <Spacing height={40} />

            {error && (
              <>
                <Typography color="error-primary" size="sm">
                  {error}
                </Typography>
                <Spacing height={16} />
              </>
            )}

            <Button
              variant="primary"
              size="md"
              fullWidth
              type="submit"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? "Setting up..." : "Set Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
