import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { type FC, useState } from "react";

import { LoginWidget } from "../login_widget/login_widget";
import { AccountInfoWidget } from "./account_info_widget";
import { AuthProgressWidget } from "./auth_progress_widget";
import type { LoginMethod } from "@oko-wallet-demo-web/types/login";

type SigningInState =
  | { status: "ready" }
  | { status: "signing-in" }
  | {
      status: "failed";
      error: string;
      errorKind: "signup_disabled" | "generic";
    };

function authTypeToLoginMethod(authType: AuthType | null): LoginMethod {
  if (!authType) {
    return "google";
  }
  if (authType === "auth0") {
    return "email";
  }
  return authType;
}

export const AccountWidget: FC<AccountWidgetProps> = () => {
  const {
    wallet: okoWallet,
    isSignedIn,
    email,
    name,
    authType,
    publicKey: publicKeySecp256k1,
  } = useOko();
  const { address: svmPublicKey } = useOkoSvm();
  const [signingInState, setSigningInState] = useState<SigningInState>({
    status: "ready",
  });

  const [loginMethod, setLoginMethod] = useState<LoginMethod>("google");

  const displayLoginMethod = isSignedIn
    ? authTypeToLoginMethod(authType)
    : loginMethod;

  function isSupportedLoginMethod(method: LoginMethod) {
    return (
      method === "google" ||
      method === "x" ||
      method === "discord" ||
      method === "telegram" ||
      method === "email" ||
      method === "github"
    );
  }

  async function handleSignIn(method: LoginMethod) {
    setLoginMethod(method);

    if (!okoWallet) {
      console.error("okoWallet is not initialized");
      return;
    }

    if (!isSupportedLoginMethod(method)) {
      console.error("Unsupported login method atm: %s", method);
      return;
    }

    try {
      setSigningInState({ status: "signing-in" });
      await okoWallet.signIn(method);

      setSigningInState({ status: "ready" });
    } catch (error: any) {
      console.error("sign in fail, err: %s", error);

      const errorMessage =
        error instanceof Error ? error.message : "Login failed";

      const errorKind =
        errorMessage === "signup_disabled" ? "signup_disabled" : "generic";

      setSigningInState({
        status: "failed",
        error: errorMessage,
        errorKind,
      });
    }
  }

  async function handleRetry() {
    setSigningInState({ status: "ready" });
  }

  async function handleSignOut() {
    if (!okoWallet) {
      console.error("okoWallet is not initialized");
      return;
    }

    await okoWallet.signOut();
    setLoginMethod("google");
    setSigningInState({ status: "ready" });
  }

  if (!okoWallet) {
    return <>Loading...</>;
  }

  // The email login loading progress is shown in the Attached popup, so we don't need to show that here
  if (signingInState.status === "signing-in" && loginMethod !== "email") {
    return <AuthProgressWidget method={loginMethod} status="loading" />;
  }

  if (signingInState.status === "failed") {
    const isSignupDisabled = signingInState.errorKind === "signup_disabled";
    return (
      <AuthProgressWidget
        method={loginMethod}
        status="failed"
        errorKind={signingInState.errorKind}
        onRetry={isSignupDisabled ? undefined : handleRetry}
      />
    );
  }

  if (isSignedIn) {
    return (
      <AccountInfoWidget
        type={displayLoginMethod}
        email={email || ""}
        publicKeySecp256k1={publicKeySecp256k1 || ""}
        publicKeyEd25519={svmPublicKey}
        name={name}
        onSignOut={handleSignOut}
      />
    );
  }

  return <LoginWidget onSignIn={handleSignIn} />;
};

// biome-ignore lint/complexity/noBannedTypes: empty props type used as component interface
export type AccountWidgetProps = {};
