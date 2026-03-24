"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { ChevronLeftIcon } from "@oko-wallet/oko-common-ui/icons/chevron_left";
import { EyeIcon } from "@oko-wallet/oko-common-ui/icons/eye";
import { EyeOffIcon } from "@oko-wallet/oko-common-ui/icons/eye_off";
import { Input } from "@oko-wallet/oko-common-ui/input";
import { Logo } from "@oko-wallet/oko-common-ui/logo";
import { OtpInput } from "@oko-wallet/oko-common-ui/otp_input";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import styles from "./page.module.scss";
import { ExpiryTimer } from "@oko-wallet-ct-dashboard/components/expiry_timer/expiry_timer";
import {
  EMAIL_REGEX,
  EMAIL_VERIFICATION_TIMER_SECONDS,
  PASSWORD_CONTAINS_NUMBER_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  SIX_DIGITS_REGEX,
} from "@oko-wallet-ct-dashboard/constants";
import {
  requestForgotPassword,
  requestResetPasswordConfirm,
  requestVerifyResetCode,
} from "@oko-wallet-ct-dashboard/fetch/users";
import { paths } from "@oko-wallet-ct-dashboard/paths";

enum Step {
  EMAIL = 0,
  CODE = 1,
  PASSWORD = 2,
}

const EMPTY_CODE = Array.from({ length: 6 }, () => "");

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(Step.EMAIL);
  const [email, setEmail] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(EMPTY_CODE);
  const [verifiedCode, setVerifiedCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCodeExpired, setIsCodeExpired] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState(0);

  const codeValue = useMemo(() => codeDigits.join(""), [codeDigits]);

  const resetError = () => setError(null);

  const goToStep = (nextStep: Step) => {
    resetError();
    setStep(nextStep);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    resetError();
    const requestStartedAt = Date.now();
    try {
      const res = await requestForgotPassword(email);
      if (res.success) {
        setCodeDigits(EMPTY_CODE);
        setVerifiedCode("");
        setTimerStartedAt(requestStartedAt);
        goToStep(Step.CODE);
      } else {
        setError(res.msg || "Failed to send code");
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (digits: string[]) => {
    const code = digits.join("");
    if (!SIX_DIGITS_REGEX.test(code) || isLoading) {
      return;
    }

    setIsLoading(true);
    resetError();
    try {
      const res = await requestVerifyResetCode(email, code);
      if (res.success) {
        setVerifiedCode(code);
        goToStep(Step.PASSWORD);
      } else {
        setError(res.msg || "Invalid verification code");
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      setError(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
      return;
    }
    if (!PASSWORD_CONTAINS_NUMBER_REGEX.test(password)) {
      setError("Password must include at least one number");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    resetError();
    setIsCodeExpired(false);
    try {
      const res = await requestResetPasswordConfirm(
        email,
        verifiedCode || codeValue,
        password,
      );
      if (res.success) {
        router.push(paths.home);
      } else {
        if (res.code === "INVALID_VERIFICATION_CODE") {
          setIsCodeExpired(true);
          setError("Verification code has expired. Please request a new code.");
        } else {
          setError(res.msg || "Failed to reset password");
        }
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestNewCode = async () => {
    if (!email || isLoading) {
      return;
    }

    setIsLoading(true);
    resetError();
    setIsCodeExpired(false);
    const requestStartedAt = Date.now();
    try {
      const res = await requestForgotPassword(email);
      if (res.success) {
        setCodeDigits(EMPTY_CODE);
        setVerifiedCode("");
        setPassword("");
        setConfirmPassword("");
        setTimerStartedAt(requestStartedAt);
        goToStep(Step.CODE);
      } else {
        setError(res.msg || "Failed to send code");
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (resetTimer: () => void) => {
    if (!email || isResending) {
      return;
    }

    setIsResending(true);
    resetError();
    try {
      const res = await requestForgotPassword(email);
      if (res.success) {
        setCodeDigits(EMPTY_CODE);
        resetTimer();
      } else {
        setError(res.msg || "Failed to resend code");
      }
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  };

  const renderEmailStep = () => (
    <div className={styles.formColumn}>
      <button
        className={styles.backButton}
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
      >
        <ChevronLeftIcon size={24} color="var(--fg-tertiary)" />
      </button>

      <div className={styles.titleBlock}>
        <Typography tagType="h1" size="display-sm" weight="semibold">
          Reset Password
        </Typography>
        <Typography size="md" weight="medium" color="secondary">
          Please enter your email address you used when you first registered.
        </Typography>
      </div>

      <form className={styles.form} onSubmit={handleEmailSubmit}>
        <Input
          label="Email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            resetError();
          }}
          fullWidth
          requiredSymbol
          error={error ?? undefined}
        />
        <Button type="submit" fullWidth disabled={!email || isLoading}>
          {isLoading ? "Sending..." : "Continue"}
        </Button>
      </form>
    </div>
  );

  const renderCodeStep = () => (
    <div className={styles.codeColumn}>
      <button
        className={styles.backButton}
        type="button"
        onClick={() => {
          setCodeDigits(EMPTY_CODE);
          setVerifiedCode("");
          goToStep(Step.EMAIL);
        }}
        aria-label="Back to email"
      >
        <ChevronLeftIcon size={24} color="var(--fg-tertiary)" />
      </button>

      <div className={styles.codeCard}>
        <div className={styles.codeCardContent}>
          <Typography
            tagType="h2"
            size="display-xs"
            weight="semibold"
            className={styles.codeTitle}
          >
            Check your email
          </Typography>
          <Typography
            size="md"
            weight="regular"
            color="primary"
            className={styles.codeDescription}
          >
            Enter the 6-digit code sent to {email || "username@email.com"}.
          </Typography>

          <div className={styles.codeOtp}>
            <OtpInput
              length={6}
              value={codeDigits}
              onChange={(digits) => {
                setCodeDigits(digits);
                resetError();
              }}
              onComplete={handleVerifyCode}
              disabled={isLoading}
              isError={!!error}
            />
            {error && (
              <Typography
                size="sm"
                weight="regular"
                color="error-primary"
                className={styles.codeError}
              >
                {error}
              </Typography>
            )}
          </div>

          <ExpiryTimer
            duration={EMAIL_VERIFICATION_TIMER_SECONDS}
            startedAt={timerStartedAt}
          >
            {({ timeDisplay, isExpired, resetTimer }) => (
              <div className={styles.resendRow}>
                <Typography size="sm" weight="medium" color="primary">
                  Didn&apos;t get the code?
                </Typography>
                <button
                  type="button"
                  className={styles.resendButton}
                  onClick={() => handleResend(resetTimer)}
                  disabled={!isExpired || isResending}
                >
                  <Typography
                    tagType="span"
                    size="sm"
                    weight="semibold"
                    color={!isExpired || isResending ? "tertiary" : "primary"}
                  >
                    Resend
                  </Typography>
                </button>
                <Typography size="sm" weight="medium" color="tertiary">
                  {timeDisplay}
                </Typography>
              </div>
            )}
          </ExpiryTimer>
        </div>
      </div>
    </div>
  );

  const renderPasswordStep = () => (
    <div className={styles.formColumn}>
      <div className={styles.titleBlock}>
        <Typography tagType="h1" size="display-sm" weight="semibold">
          Change Password
        </Typography>
        <Typography size="md" weight="medium" color="secondary">
          Time for a fresh, secure password
        </Typography>
      </div>

      <form className={styles.passwordForm} onSubmit={handlePasswordSubmit}>
        <div className={styles.passwordFields}>
          <Input
            label="Enter new password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              resetError();
            }}
            fullWidth
            requiredSymbol
            maxLength={PASSWORD_MAX_LENGTH}
            helpText={
              error
                ? undefined
                : `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters and must include numbers.`
            }
            SideComponent={
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            }
          />
          <Input
            label="Confirm new password"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              resetError();
            }}
            fullWidth
            requiredSymbol
            maxLength={PASSWORD_MAX_LENGTH}
            SideComponent={
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={
                  showConfirm
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirm ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            }
          />
        </div>

        {error && (
          <Typography
            size="sm"
            weight="regular"
            color="error-primary"
            className={styles.passwordError}
          >
            {error}
          </Typography>
        )}

        <div className={styles.passwordButton}>
          {isCodeExpired ? (
            <Button
              type="button"
              fullWidth
              onClick={handleRequestNewCode}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Request New Code"}
            </Button>
          ) : (
            <Button
              type="submit"
              fullWidth
              disabled={!password || !confirmPassword || isLoading}
            >
              {isLoading ? "Updating..." : "Update"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );

  const bodyClassName =
    step === Step.PASSWORD ? styles.bodyPassword : styles.bodyDefault;

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link href={paths.home}>
          <Logo theme="light" />
        </Link>
        <div className={styles.headerSpacer} />
      </header>

      <main className={`${styles.body} ${bodyClassName}`}>
        {step === Step.EMAIL && renderEmailStep()}
        {step === Step.CODE && renderCodeStep()}
        {step === Step.PASSWORD && renderPasswordStep()}
      </main>
    </div>
  );
}
