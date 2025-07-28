import React, { useState } from "react";
import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";
import { Button } from "@keplr-ewallet/ewallet-common-ui/button";
import { KeplrIcon } from "@keplr-ewallet/ewallet-common-ui/icons/keplr_icon";
import { LeapIcon } from "@keplr-ewallet/ewallet-common-ui/icons/leap_icon";
import { MetamaskIcon } from "@keplr-ewallet/ewallet-common-ui/icons/metamask_icon";
import { GoogleIcon } from "@keplr-ewallet/ewallet-common-ui/icons/google_icon";
import { Logo } from "@keplr-ewallet/ewallet-common-ui/logo";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import { Widget } from "../widget_components";
import styles from "./login_widget.module.scss";
import { WalletBox } from "./wallet_box";

export const LoginWidget: React.FC<LoginWidgetProps> = () => {
  const { eWallet, isAuthenticated, setIsAuthenticated } = useKeplrEwallet();
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
      setIsAuthenticated(false);
      setWalletInfo(undefined);
    }
  };

  if (isSigningIn) {
    return (
      <Widget>
        <div className={styles.signingInWrapper}>
          <div className={styles.googleCircle}>
            <GoogleIcon width={48} height={48} />
          </div>
          <Typography
            size="md"
            weight="medium"
            color="primary"
            className={styles.signingInText}
          >
            Signing in
          </Typography>
        </div>
      </Widget>
    );
  }

  if (walletInfo) {
    return (
      <Widget>
        <div className={styles.loginInfoContainer}>
          <div className={styles.loginInfoRow}>
            <Typography size="lg" weight="medium" color="primary">
              {walletInfo?.email}
            </Typography>
            <button className={styles.signOutButton} onClick={handleSignOut}>
              <Typography
                tagType="span"
                size="sm"
                weight="semibold"
                color="brand-secondary-hover"
              >
                Sign out
              </Typography>
            </button>
          </div>
          <div className={styles.publicKeyRow}>
            <Typography
              size="sm"
              weight="semibold"
              color="tertiary"
              className={styles.label}
            >
              Public Key
            </Typography>
            <Typography
              size="md"
              weight="medium"
              color="primary"
              className={styles.publicKey}
            >
              {walletInfo?.publicKey}
            </Typography>
          </div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget>
      <div className={styles.container}>
        <div className={styles.logoWrapper}>
          <Logo />
        </div>
        <Button variant="secondary" size="md" fullWidth onClick={handleSignIn}>
          <GoogleIcon width={20} height={20} />
          Google Login
        </Button>
        <div className={styles.dividerRow}>
          <div className={styles.line} />
          <Typography
            tagType="span"
            size="xs"
            weight="medium"
            color="quaternary"
          >
            Coming soon
          </Typography>
          <div className={styles.line} />
        </div>
        <div className={styles.walletBoxRow}>
          <WalletBox icon={<KeplrIcon />} label="Keplr" />
          <WalletBox icon={<MetamaskIcon />} label="Metamask" />
          <WalletBox icon={<LeapIcon />} label="Leap" />
        </div>
      </div>
    </Widget>
  );
};

export interface LoginWidgetProps {}
