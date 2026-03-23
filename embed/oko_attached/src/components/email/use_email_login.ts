import type {
  EmailLoginModalPayload,
  OAuthState,
} from "@oko-wallet/oko-sdk-core";
import { useEffect, useMemo, useState } from "react";

import { getAuth0WebAuth } from "@oko-wallet-attached/config/auth0";
import {
  sendEmailOTPCode,
  verifyEmailOTPCode,
} from "@oko-wallet-attached/lib/auth0";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 180; // 3 minutes
const LOG_PREFIX = "[attached][email_login]";
const EMAIL_STORAGE_KEY = "oko_email_login_pending_email";

export type EmailLoginModalStep = "enter_email" | "verify_code";

export interface UseEmailLoginArgs {
  modalId: string;
  data: EmailLoginModalPayload["data"];
}

interface UseEmailLoginResult {
  step: EmailLoginModalStep;
  email: string;
  setEmail: (value: string) => void;
  otpDigits: string[];
  setOtpDigits: (digits: string[]) => void;
  isEmailValid: boolean;
  isOtpComplete: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  infoMessage: string | null;
  resendTimer: number;
  handleSubmitEmail: () => Promise<void>;
  handleVerifyCode: () => Promise<void>;
  handleResendCode: () => Promise<void>;
  handleBack: () => void;
  handleClose: () => void;
  resetError: () => void;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function useEmailLogin({
  modalId,
  data,
}: UseEmailLoginArgs): UseEmailLoginResult {
  const closeModal = useMemoryState((state) => state.closeModal);
  const memoryHostOrigin = useMemoryState((state) => state.hostOrigin);

  // In mobile mode (system browser), MemoryState is empty.
  // Fall back to host_origin from URL query params.
  const hostOrigin = useMemo(() => {
    if (memoryHostOrigin) {
      return memoryHostOrigin;
    }
    if (typeof window === "undefined") {
      return null;
    }
    return new URLSearchParams(window.location.search).get("host_origin");
  }, [memoryHostOrigin]);

  const oauthContext = data.oauth ?? null;
  const parsedOAuthState = useMemo<OAuthState | null>(() => {
    if (!oauthContext?.state) {
      return null;
    }

    try {
      return JSON.parse(oauthContext.state) as OAuthState;
    } catch (error) {
      console.error(`${LOG_PREFIX} failed to parse oauth state`, error);
      return null;
    }
  }, [oauthContext]);

  const webAuth = useMemo(() => getAuth0WebAuth(), []);

  const [step, setStep] = useState<EmailLoginModalStep>("enter_email");
  const [email, setEmail] = useState(data.email_hint ?? "");
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array.from({ length: CODE_LENGTH }, () => ""),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const isEmailValid = useMemo(() => isValidEmail(email), [email]);
  const isOtpComplete = useMemo(
    () =>
      otpDigits.filter((digit) => digit.trim().length > 0).length ===
        CODE_LENGTH && otpDigits.join("").length === CODE_LENGTH,
    [otpDigits],
  );

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

  useEffect(() => {
    if (isOtpComplete && !isSubmitting && !errorMessage) {
      void handleVerifyCode();
    }
  }, [isOtpComplete, isSubmitting, errorMessage]);

  const resetError = () => setErrorMessage(null);

  const ensureOAuthContext = () => {
    if (!oauthContext || !parsedOAuthState) {
      console.error(`${LOG_PREFIX} missing oauth context for email login`);
      setErrorMessage(
        "Email login is not available right now. Please try again.",
      );
      return false;
    }

    if (!parsedOAuthState.apiKey || !parsedOAuthState.targetOrigin) {
      console.error(
        `${LOG_PREFIX} oauth state missing api key or target origin`,
      );
      setErrorMessage(
        "Email login is not available right now. Please try again.",
      );
      return false;
    }

    return true;
  };

  const handleClose = () => {
    console.log(`${LOG_PREFIX} modal closed by user`);
    closeModal({
      modal_type: "auth/email_login",
      modal_id: modalId,
      type: "reject",
    });
    // Close the popup window so the host UI doesn't fall back to a loading state.
    if (typeof window !== "undefined" && window.opener) {
      window.close();
    }
  };

  const handleSubmitEmail = async () => {
    if (!isEmailValid || isSubmitting) {
      return;
    }
    if (!hostOrigin) {
      console.warn(`${LOG_PREFIX} missing host origin for submit email step`);
      setErrorMessage("Missing host origin");
      return;
    }
    if (!ensureOAuthContext()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      console.log(
        `${LOG_PREFIX} submitting email for code request`,
        email.trim(),
      );
      await sendEmailOTPCode({
        webAuth,
        email: email.trim(),
      });
      setStep("verify_code");
      setInfoMessage(null);
      setOtpDigits(Array.from({ length: CODE_LENGTH }, () => ""));
      setResendTimer(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      const message =
        err instanceof Error ? err.message : "Failed to request the code.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0 || isSubmitting || !hostOrigin) {
      if (!hostOrigin) {
        console.warn(`${LOG_PREFIX} missing host origin for resend`);
      }
      return;
    }
    if (!ensureOAuthContext()) {
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      console.log(
        `${LOG_PREFIX} resending verification code`,
        email.trim(),
        `(host: ${hostOrigin})`,
      );
      await sendEmailOTPCode({
        webAuth,
        email: email.trim(),
      });
      setInfoMessage("A new code was sent.");
      setResendTimer(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      const message =
        err instanceof Error ? err.message : "Failed to resend the code.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!hostOrigin) {
      console.warn(`${LOG_PREFIX} missing host origin for verify step`);
      setErrorMessage("Missing host origin");
      return;
    }
    if (!isOtpComplete || isSubmitting) {
      setErrorMessage("Enter the 6-digit verification code.");
      return;
    }
    if (!ensureOAuthContext()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage("Finish verification in the secure Auth0 window.");
    console.log(
      `${LOG_PREFIX} verifying code for ${email.trim()} (host: ${hostOrigin})`,
    );

    try {
      window.sessionStorage.setItem(EMAIL_STORAGE_KEY, email.trim());
    } catch (error) {
      console.warn(`${LOG_PREFIX} failed to set session storage`, error);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const modalIdFromQuery = urlParams.get("modal_id");
    if (!modalIdFromQuery) {
      setErrorMessage("Missing modal_id");
      setIsSubmitting(false);
      return;
    }

    const callbackUrl = new URL(`${window.location.origin}/email/callback`);
    callbackUrl.searchParams.set("modal_id", modalIdFromQuery);
    callbackUrl.searchParams.set("host_origin", hostOrigin);

    const currentTheme =
      useAppState.getState().getTheme(hostOrigin) ?? urlParams.get("theme");
    if (currentTheme) {
      callbackUrl.searchParams.set("theme", currentTheme);
    }

    verifyEmailOTPCode({
      webAuth,
      email: email.trim(),
      verificationCode: otpDigits.join(""),
      callbackUrl: callbackUrl.toString(),
      nonce: oauthContext!.nonce,
      state: oauthContext!.state,
      onError: (err) => {
        console.error(`${LOG_PREFIX} passwordlessLogin error`, err);
        // Customize error message for invalid verification code
        const errorMsg = err.message.toLowerCase();
        if (
          errorMsg.includes("wrong email") ||
          errorMsg.includes("verification code") ||
          errorMsg.includes("invalid code")
        ) {
          setErrorMessage("Invalid code. Try again.");
        } else {
          setErrorMessage(err.message);
        }
        setInfoMessage(null);
        setIsSubmitting(false);
      },
    });
  };

  const handleBack = () => {
    console.log(`${LOG_PREFIX} user moved back to email entry step`);
    setStep("enter_email");
    setOtpDigits(Array.from({ length: CODE_LENGTH }, () => ""));
    setInfoMessage(null);
    setErrorMessage(null);
    setResendTimer(0);
  };

  console.debug(`${LOG_PREFIX} modal state`, {
    step,
    hostOrigin,
  });

  return {
    step,
    email,
    setEmail,
    otpDigits,
    setOtpDigits,
    isEmailValid,
    isOtpComplete,
    isSubmitting,
    errorMessage,
    infoMessage,
    resendTimer,
    handleSubmitEmail,
    handleVerifyCode,
    handleResendCode,
    handleBack,
    handleClose,
    resetError,
  };
}
