import { type FormEvent, useEffect, useMemo, useState } from "react";

import type { OAuthState } from "@oko-wallet/oko-sdk-core";
import { OtpInput } from "@oko-wallet/oko-common-ui/otp_input";

import { getAuth0WebAuth } from "@oko-wallet-attached/config/auth0";
import {
  sendEmailOTPCode,
  verifyEmailOTPCode,
} from "@oko-wallet-attached/lib/auth0";

import {
  findEmbeddedIframe,
  generateNonce,
  sendReauthParamsToIframe,
} from "./use_export_reauth";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 180;
const LOG_PREFIX = "[attached][email_reauth]";

type Step = "enter_email" | "verify_code";

export function EmailReauth() {
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
      apiKey: "",
      targetOrigin: window.location.origin,
      provider: "auth0",
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

  const handleVerifyCode = async () => {
    if (!isOtpComplete || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const callbackUrl = `${window.location.origin}/email/callback`;

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
  };

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

  const onSubmitEmail = (e: FormEvent) => {
    e.preventDefault();
    void handleSubmitEmail();
  };

  const onSubmitCode = (e: FormEvent) => {
    e.preventDefault();
    void handleVerifyCode();
  };

  if (step === "enter_email") {
    return (
      <div style={{ padding: "24px", maxWidth: "400px", margin: "0 auto" }}>
        <h3>Email Re-Authentication</h3>
        <form onSubmit={onSubmitEmail}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => {
              resetError();
              setEmail(e.target.value);
            }}
            style={{
              width: "100%",
              padding: "8px",
              marginBottom: "8px",
              boxSizing: "border-box",
            }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!isEmailValid || isSubmitting || !iframeSent}
            style={{ width: "100%", padding: "8px" }}
          >
            {isSubmitting ? "Sending..." : "Send Code"}
          </button>
          {errorMessage && (
            <div style={{ color: "red", marginTop: "8px" }}>{errorMessage}</div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "400px", margin: "0 auto" }}>
      <h3>Check your email</h3>
      <p>Enter the 6-digit code sent to {email}.</p>
      <form onSubmit={onSubmitCode}>
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
        {errorMessage && (
          <div style={{ color: "red", marginTop: "8px" }}>{errorMessage}</div>
        )}
        <div style={{ marginTop: "12px" }}>
          <span>Didn&apos;t get the code? </span>
          <button
            type="button"
            disabled={resendTimer > 0 || isSubmitting}
            onClick={() => {
              resetError();
              void handleResendCode();
            }}
            style={{ cursor: "pointer" }}
          >
            Resend
          </button>
          {resendTimer > 0 && <span> {resendTimer}s</span>}
        </div>
      </form>
    </div>
  );
}
