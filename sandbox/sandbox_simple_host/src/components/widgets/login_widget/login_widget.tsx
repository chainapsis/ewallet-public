import type { SignInType } from "@oko-wallet/oko-sdk-core";
import { type FC, useState } from "react";

import { CosmosAccountsModal } from "@/components/cosmos_accounts_modal/cosmos_accounts_modal";
import { useAddresses } from "@/hooks/use_addresses";
import { useOko } from "@/hooks/use_oko";
import { useUserInfoState } from "@/state/user_info";
import { Widget } from "../widget_components";
import styles from "./login_widget.module.scss";

export const LoginWidget: FC<LoginWidgetProps> = () => {
  const { okoCosmos } = useOko();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInStrategy, setSignInStrategy] = useState<SignInType | null>(null);
  const { isSignedIn, email, publicKey } = useUserInfoState();
  const { cosmosAddress, ethAddress } = useAddresses();
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleSignIn(strategy: SignInType) {
    if (!okoCosmos) {
      return;
    }

    try {
      setIsSigningIn(true);
      setSignInStrategy(strategy);
      await okoCosmos.okoWallet.signIn(strategy);
    } catch (error) {
      console.error(`[sandbox] ${strategy} sign in failed`, error);
    } finally {
      setIsSigningIn(false);
      setSignInStrategy(null);
    }
  }

  const handleSignOut = async () => {
    if (okoCosmos) {
      await okoCosmos.okoWallet.signOut();
    }
  };

  if (isSigningIn) {
    return (
      <Widget>
        <div className={styles.signingInWrapper}>
          <div className={styles.googleCircle}>
            {signInStrategy === "email"
              ? "email"
              : signInStrategy === "telegram"
                ? "telegram"
                : signInStrategy === "x"
                  ? "x"
                  : "google"}
          </div>
          <p>
            Signing in{" "}
            {signInStrategy === "email"
              ? "(email iframe)"
              : signInStrategy === "telegram"
                ? "(Telegram OAuth)"
                : signInStrategy === "x"
                  ? "(X OAuth)"
                  : "(Google OAuth)"}
          </p>
        </div>
      </Widget>
    );
  }

  if (isSignedIn) {
    return (
      <Widget>
        <div className={styles.loginInfoContainer}>
          <div className={styles.loginInfoRow}>
            <p className={styles.value}>{email}</p>
            <button
              type="button"
              className={styles.signOutButton}
              onClick={handleSignOut}
            >
              <p>Sign out</p>
            </button>
          </div>
          <div className={styles.publicKeyRow}>
            <p className={styles.label}>Public Key</p>
            <p className={styles.value}>{publicKey}</p>
          </div>
          <div className={styles.addressRow}>
            <p className={styles.label}>Eth Address</p>
            <p className={styles.value}>{ethAddress}</p>
          </div>
          <div className={styles.addressRow}>
            <p className={styles.label}>Cosmos Address</p>
            <p className={styles.value}>{cosmosAddress}</p>
          </div>

          <div className={styles.addressRow}>
            <p className={styles.label}>Cosmos Accounts</p>
            <button
              type="button"
              className={styles.signOutButton}
              onClick={() => setIsModalOpen(true)}
            >
              <p>View Cosmos Accounts</p>
            </button>
          </div>
        </div>
        <CosmosAccountsModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </Widget>
    );
  }

  return (
    <Widget>
      <div className={styles.container}>
        <div className={styles.logoWrapper}>logo</div>
        <button
          type="button"
          onClick={() => handleSignIn("google")}
          disabled={isSigningIn}
          data-testid="google-login-btn"
        >
          Google Login
        </button>
        <button
          type="button"
          onClick={() => handleSignIn("email")}
          disabled={isSigningIn}
          data-testid="email-login-btn"
        >
          Email Login
        </button>
        <button
          type="button"
          onClick={() => handleSignIn("telegram")}
          disabled={isSigningIn}
          data-testid="telegram-login-btn"
        >
          Telegram Login
        </button>
        <button
          type="button"
          onClick={() => handleSignIn("x")}
          disabled={isSigningIn}
          data-testid="x-login-btn"
        >
          Twitter(x) Login
        </button>
        <button
          type="button"
          onClick={() => {
            const width = 440;
            const height = 285;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            window.open(
              "http://localhost:3201/error-dev",
              "ErrorPopup",
              `width=${width},height=${height},left=${left},top=${top}`,
            );
          }}
        >
          Open Error Popup
        </button>
        <button
          type="button"
          onClick={() => {
            const width = 440;
            const height = 285;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            window.open(
              "http://localhost:3201/loading-dev",
              "LoadingPopup",
              `width=${width},height=${height},left=${left},top=${top}`,
            );
          }}
        >
          Open Loading Popup
        </button>
        <div className={styles.walletBoxRow}>
          {/* <WalletBox icon={<KeplrIcon />} label="Keplr" /> */}
          {/* <WalletBox icon={<MetamaskIcon />} label="Metamask" /> */}
          {/* <WalletBox icon={<LeapIcon />} label="Leap" /> */}
        </div>
      </div>
    </Widget>
  );
};

export type LoginWidgetProps = {};
