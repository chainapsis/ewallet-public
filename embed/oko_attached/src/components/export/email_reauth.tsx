import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
import { Logo } from "@oko-wallet/oko-common-ui/logo";
import { OtpInput } from "@oko-wallet/oko-common-ui/otp_input";
import { ThemeContext } from "@oko-wallet/oko-common-ui/theme";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { OAuthState } from "@oko-wallet/oko-sdk-core";
import { useContext, useEffect, useMemo, useState } from "react";

import styles from "./email_reauth.module.scss";
import {
  findEmbeddedIframe,
  generateNonce,
  sendReauthParamsToIframe,
} from "./use_export_reauth";
import { getAuth0WebAuth } from "@oko-wallet-attached/config/auth0";
import {
  sendEmailOTPCode,
  verifyEmailOTPCode,
} from "@oko-wallet-attached/lib/auth0";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 180;
const LOG_PREFIX = "[attached][email_reauth]";

type Step = "enter_email" | "verify_code";

export const EmailReauth = () => {
  const theme = useContext(ThemeContext);
  const webAuth = useMemo(() => getAuth0WebAuth(), []);

  const [step, setStep] = useState<Step>("enter_email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array.from({ length: CODE_LENGTH }, () => ""),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [iframeSent, setIframeSent] = useState(false);

  const isEmailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email],
  );
  const isOtpComplete = useMemo(
    () =>
      otpDigits.filter((d) => d.trim().length > 0).length === CODE_LENGTH &&
      otpDigits.join("").length === CODE_LENGTH,
    [otpDigits],
  );

  // Generate nonce and send to iframe on mount
  const nonce = useMemo(() => generateNonce(), []);
  const oauthState = useMemo<OAuthState>(
    () => ({
      apiKey: "reauth",
      targetOrigin: window.location.origin,
      provider: "auth0",
      modalId: "reauth",
    }),
    [],
  );

  useEffect(() => {
    const iframe = findEmbeddedIframe();
    if (iframe) {
      sendReauthParamsToIframe(iframe, { nonce });
      setIframeSent(true);
    } else {
      setErrorMessage(
        "Cannot find embedded iframe. Make sure this page was opened from the dashboard.",
      );
    }
  }, [nonce]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendTimer]);

  // Auto-verify when OTP is complete
  // biome-ignore lint/correctness/useExhaustiveDependencies: rendering infinite loop
  useEffect(() => {
    if (isOtpComplete && !isSubmitting && !errorMessage) {
      void handleVerifyCode();
    }
  }, [isOtpComplete, isSubmitting, errorMessage]);

  const resetError = () => setErrorMessage(null);

  const handleSubmitEmail = async () => {
    if (!isEmailValid || isSubmitting || !iframeSent) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      console.log(`${LOG_PREFIX} requesting OTP for`, email.trim());
      await sendEmailOTPCode({ webAuth, email: email.trim() });
      setStep("verify_code");
      setOtpDigits(Array.from({ length: CODE_LENGTH }, () => ""));
      setResendTimer(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to request the code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  async function handleVerifyCode() {
    if (!isOtpComplete || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const callbackUrl = `${window.location.origin}/email/callback?modal_id=reauth`;

    console.log(`${LOG_PREFIX} verifying OTP for`, email.trim());

    verifyEmailOTPCode({
      webAuth,
      email: email.trim(),
      verificationCode: otpDigits.join(""),
      callbackUrl,
      nonce,
      state: JSON.stringify(oauthState),
      onError: (err) => {
        console.error(`${LOG_PREFIX} verification error`, err);
        const msg = err.message.toLowerCase();
        if (
          msg.includes("wrong email") ||
          msg.includes("verification code") ||
          msg.includes("invalid code")
        ) {
          setErrorMessage("Invalid code. Try again.");
        } else {
          setErrorMessage(err.message);
        }
        setIsSubmitting(false);
      },
    });
  }

  const handleResendCode = async () => {
    if (resendTimer > 0 || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await sendEmailOTPCode({ webAuth, email: email.trim() });
      setResendTimer(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to resend the code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitEmail = (e: React.SubmitEvent) => {
    e.preventDefault();
    void handleSubmitEmail();
  };

  const onSubmitCode = (e: React.SubmitEvent) => {
    e.preventDefault();
    void handleVerifyCode();
  };

  return (
    <div className={styles.container}>
      <div className={styles.body}>
        {step === "enter_email" ? (
          <div className={styles.card}>
            <div className={styles.cardTop}>
              <Logo theme={theme} />
              <div className={styles.fieldHeader}>
                Enter your email to continue
              </div>
            </div>
            <div className={styles.cardBottom}>
              <form className={styles.form} onSubmit={onSubmitEmail}>
                <div className={styles.emailRow}>
                  <div className={styles.emailInner}>
                    <MailboxIcon size={20} className={styles.emailIcon} />
                    <input
                      name="oko-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => {
                        resetError();
                        setEmail(e.target.value);
                      }}
                      className={styles.emailInput}
                    />
                    <button
                      className={`${styles.nextButton} ${
                        isEmailValid && !isSubmitting
                          ? styles.nextButtonActive
                          : ""
                      }`}
                      type="submit"
                      disabled={!isEmailValid || isSubmitting || !iframeSent}
                    >
                      Submit
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <Typography size="sm" color="error-primary">
                    {errorMessage}
                  </Typography>
                )}

                <div className={styles.actions} />
              </form>
            </div>
          </div>
        ) : (
          <div className={styles.otpShell}>
            <form
              className={`${styles.form} ${styles.otpForm}`}
              onSubmit={onSubmitCode}
            >
              <div className={styles.otpPanel}>
                <div className={styles.otpTitle}>Check your email</div>
                <div className={styles.otpSubtitle}>
                  {`Enter the 6-digit code sent to ${email || "your email"}.`}
                </div>

                <div className={styles.otpCodeSection}>
                  <div
                    className={`${styles.otpInputRow} ${errorMessage ? styles.otpInputRowError : ""}`}
                  >
                    <OtpInput
                      length={6}
                      value={otpDigits}
                      onChange={(digits: string[]) => {
                        resetError();
                        setOtpDigits(digits);
                      }}
                      disabled={isSubmitting}
                      isError={!!errorMessage}
                    />
                  </div>

                  {errorMessage && (
                    <Typography
                      tagType="div"
                      size="xs"
                      weight="medium"
                      color="error-primary"
                      className={styles.otpErrorMessage}
                    >
                      {errorMessage}
                    </Typography>
                  )}
                </div>

                <div className={styles.resendRow}>
                  <span className={styles.resendText}>
                    Didn&apos;t get the code?
                  </span>
                  <button
                    type="button"
                    className={styles.resendLink}
                    disabled={resendTimer > 0 || isSubmitting}
                    onClick={() => {
                      resetError();
                      void handleResendCode();
                    }}
                  >
                    Resend
                  </button>
                  {resendTimer > 0 && (
                    <span
                      className={styles.resendTimer}
                    >{`${resendTimer}s`}</span>
                  )}
                </div>
              </div>

              <div className={styles.actions} />
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
