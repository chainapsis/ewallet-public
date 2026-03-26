"use client";

import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FC, useEffect, useState } from "react";

import { LoginWidget } from "../login_widget/login_widget";
import styles from "./account_widget.module.scss";
import { AuthProgressWidget } from "./auth_progress_widget";
import { Spinner } from "@oko-wallet-user-dashboard/components/spinner/spinner";
import { paths } from "@oko-wallet-user-dashboard/paths";
import { refreshSvmEd25519Key } from "@oko-wallet-user-dashboard/utils/sdk";

type SigningInState =
  | { status: "ready" }
  | { status: "signing-in" }
  | { status: "failed"; error: string };

export const AccountWidget: FC<AccountWidgetProps> = () => {
  const { wallet: okoWallet, isSignedIn } = useOko();
  const { svmWallet } = useOkoSvm();
  const queryClient = useQueryClient();
  const [signingInState, setSigningInState] = useState<SigningInState>({
    status: "ready",
  });
  const router = useRouter();

  // TODO: add other login methods, and update the type accordingly
  const [loginMethod, setLoginMethod] = useState<AuthType>("google");

  async function handleSignIn(method: AuthType) {
    setLoginMethod(method);

    if (!okoWallet) {
      console.error("okoWallet is not initialized");
      return;
    }

    if (
      method !== "google" &&
      method !== "auth0" &&
      method !== "telegram" &&
      method !== "x" &&
      method !== "discord" &&
      method !== "github"
    ) {
      console.error("Unsupported login method atm: %s", method);
      return;
    }

    try {
      setSigningInState({ status: "signing-in" });
      await okoWallet.signIn(method === "auth0" ? "email" : method);

      // After sign-in, Ed25519 key is now available in the iframe.
      // Re-fetch it for SVM SDK (may have been null during initial lazy init).
      const refreshed = svmWallet
        ? await refreshSvmEd25519Key(svmWallet)
        : false;
      if (refreshed) {
        await queryClient.invalidateQueries({ queryKey: ["address", "svm"] });
      }

      setSigningInState({ status: "ready" });
    } catch (error: any) {
      console.error("sign in fail, err: %s", error);

      const errorMessage =
        error instanceof Error ? error.message : "Login failed";

      setSigningInState({ status: "failed", error: errorMessage });
    }
  }

  async function handleRetry() {
    setSigningInState({ status: "ready" });
  }

  useEffect(() => {
    if (isSignedIn) {
      router.push(paths.home);
    }
  }, [isSignedIn]);

  if (!okoWallet) {
    return (
      <div className={styles.spinnerWrapper}>
        <Spinner size={30} />
      </div>
    );
  }

  // The email login loading progress is shown in the Attached popup, so we don't need to show that here
  if (signingInState.status === "signing-in" && loginMethod !== "auth0") {
    return <AuthProgressWidget method={loginMethod} status="loading" />;
  }

  if (signingInState.status === "failed") {
    return (
      <AuthProgressWidget
        method={loginMethod}
        status="failed"
        onRetry={handleRetry}
      />
    );
  }

  return <LoginWidget onSignIn={handleSignIn} />;
};

// biome-ignore lint/complexity/noBannedTypes: empty props type used as component interface
export type AccountWidgetProps = {};
