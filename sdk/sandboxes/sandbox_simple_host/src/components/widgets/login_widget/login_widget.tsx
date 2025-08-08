import React, { useState } from "react";

import { Widget } from "../widget_components";
import styles from "./login_widget.module.scss";
import { useKeplrEwallet } from "@/components/keplr_ewallet_provider/use_keplr_ewallet";
import { useAuthState } from "@/state/auth";

export const LoginWidget: React.FC<LoginWidgetProps> = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const eWallet = cosmosEWallet?.eWallet;
  const auth = useAuthState();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await eWallet?.signIn("google");
      const email = await eWallet?.getEmail();
      const publicKey = await eWallet?.getPublicKey();
      if (email && publicKey) {
        auth.setEmail(email);
        auth.setPublicKey(publicKey);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (eWallet) {
      await eWallet.signOut();
      auth.reset();
    }
  };

  if (isSigningIn) {
    return (
      <Widget>
        <div className={styles.signingInWrapper}>
          <div className={styles.googleCircle}>google</div>
          <p>Signing in</p>
        </div>
      </Widget>
    );
  }

  if (auth.email && auth.publicKey) {
    return (
      <Widget>
        <div className={styles.loginInfoContainer}>
          <div className={styles.loginInfoRow}>
            <p>{auth.email}</p>
            <button className={styles.signOutButton} onClick={handleSignOut}>
              <p>Sign out</p>
            </button>
          </div>
          <div className={styles.publicKeyRow}>
            <p>Public Key</p>
            <p>{auth.publicKey}</p>
          </div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget>
      <div className={styles.container}>
        <div className={styles.logoWrapper}>logo</div>
        <button onClick={handleSignIn}>Google Login</button>
        <div className={styles.walletBoxRow}>
          {/* <WalletBox icon={<KeplrIcon />} label="Keplr" /> */}
          {/* <WalletBox icon={<MetamaskIcon />} label="Metamask" /> */}
          {/* <WalletBox icon={<LeapIcon />} label="Leap" /> */}
        </div>
      </div>
    </Widget>
  );
};

export interface LoginWidgetProps {}
