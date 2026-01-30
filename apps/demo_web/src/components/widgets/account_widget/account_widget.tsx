import { useState, type FC } from "react";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { useSDKState } from "@oko-wallet-demo-web/state/sdk";
import { useUserInfoState } from "@oko-wallet-demo-web/state/user_info";
import { AuthProgressWidget } from "./auth_progress_widget";
import { AccountInfoWidget } from "./account_info_widget";
import { LoginWidget } from "../login_widget/login_widget";
import type { LoginMethod } from "@oko-wallet-demo-web/types/login";

type SigningInState =
  | { status: "ready" }
  | { status: "signing-in" }
  | { status: "failed"; error: string };

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
  const okoWallet = useSDKState((state) => state.oko_cosmos)?.okoWallet;
  const [signingInState, setSigningInState] = useState<SigningInState>({
    status: "ready",
  });
  const email = useUserInfoState((state) => state.email);
  const publicKeySecp256k1 = useUserInfoState(
    (state) => state.publicKeySecp256k1,
  );
  const publicKeyEd25519 = useUserInfoState((state) => state.publicKeyEd25519);
  const name = useUserInfoState((state) => state.name);
  const authType = useUserInfoState((state) => state.authType);
  const isSignedIn = useUserInfoState((state) => state.isSignedIn);
  const clearUserInfo = useUserInfoState((state) => state.clearUserInfo);

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
      method === "email"
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

      setSigningInState({ status: "failed", error: errorMessage });
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
    clearUserInfo();
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
    return (
      <AuthProgressWidget
        method={loginMethod}
        status="failed"
        onRetry={handleRetry}
      />
    );
  }

  if (isSignedIn) {
    return (
      <AccountInfoWidget
        type={displayLoginMethod}
        email={email || ""}
        publicKeySecp256k1={publicKeySecp256k1 || ""}
        publicKeyEd25519={publicKeyEd25519}
        name={name}
        onSignOut={handleSignOut}
      />
    );
  }

  return <LoginWidget onSignIn={handleSignIn} />;
};

export interface AccountWidgetProps {}
