import React, { useState } from "react";

// import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";
// import { Button } from "@keplr-ewallet/ewallet-common-ui/button";
// import { KeplrIcon } from "@keplr-ewallet/ewallet-common-ui/icons/keplr_icon";
// import { LeapIcon } from "@keplr-ewallet/ewallet-common-ui/icons/leap_icon";
// import { MetamaskIcon } from "@keplr-ewallet/ewallet-common-ui/icons/metamask_icon";
// import { GoogleIcon } from "@keplr-ewallet/ewallet-common-ui/icons/google_icon";
// import { Logo } from "@keplr-ewallet/ewallet-common-ui/logo";
// import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import { Widget } from "../widget_components";
import styles from "./login_widget.module.scss";
import { WalletBox } from "./wallet_box";
import { useKeplrEwallet } from "@/contexts/KeplrEwalletProvider";

export const LoginWidget: React.FC<LoginWidgetProps> = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const eWallet = cosmosEWallet?.eWallet;
  const [walletInfo, setWalletInfo] = useState<
    | {
        email: string;
        publicKey: string;
      }
    | undefined
  >();

  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await eWallet?.signIn("google");
      const email = await eWallet?.getEmail();
      const publicKey = await eWallet?.getPublicKey();
      if (email && publicKey) {
        setWalletInfo({
          email,
          publicKey,
        });
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
      // setIsAuthenticated(false);
      setWalletInfo(undefined);
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

  if (walletInfo) {
    return (
      <Widget>
        <div className={styles.loginInfoContainer}>
          <div className={styles.loginInfoRow}>
            <p>{walletInfo?.email}</p>
            <button className={styles.signOutButton} onClick={handleSignOut}>
              <p>Sign out</p>
            </button>
          </div>
          <div className={styles.publicKeyRow}>
            <p>Public Key</p>
            <p>{walletInfo?.publicKey}</p>
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
