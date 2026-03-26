"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { ArbitrumIcon } from "@oko-wallet/oko-common-ui/icons/arbitrum_icon";
import { BaseIcon } from "@oko-wallet/oko-common-ui/icons/base_icon";
import { CosmosIcon } from "@oko-wallet/oko-common-ui/icons/cosmos_icon";
import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { EthereumIcon } from "@oko-wallet/oko-common-ui/icons/ethereum_icon";
import { GithubIcon } from "@oko-wallet/oko-common-ui/icons/github_icon";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { InfoCircleIcon } from "@oko-wallet/oko-common-ui/icons/info_circle";
import { InitiaIcon } from "@oko-wallet/oko-common-ui/icons/initia_icon";
import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
// import { RialoIcon } from "@oko-wallet/oko-common-ui/icons/rialo_icon";
import { SolanaCircleIcon } from "@oko-wallet/oko-common-ui/icons/solana_circle_icon";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { ZigchainIcon } from "@oko-wallet/oko-common-ui/icons/zigchain_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type {
  OkoWalletMsgExportPrivateKeyAck,
  OkoWalletProtectedMsgs,
} from "@oko-wallet/oko-sdk-core";
import { useOko } from "@oko-wallet/oko-sdk-react";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./page.module.scss";
import { Spinner } from "@oko-wallet-user-dashboard/components/spinner/spinner";
import { displayToast } from "@oko-wallet-user-dashboard/components/toast";

const getAuthProviderInfo = (
  authType: AuthType | null,
): {
  icon: ReactNode;
  label: string;
} => {
  switch (authType) {
    case "google":
      return {
        icon: <GoogleIcon width={24} height={24} />,
        label: "Google Login",
      };
    case "discord":
      return { icon: <DiscordIcon size={24} />, label: "Discord" };
    case "telegram":
      return { icon: <TelegramIcon size={24} />, label: "Telegram" };
    case "x":
      return { icon: <XIcon size={24} />, label: "X" };
    case "github":
      return { icon: <GithubIcon size={24} />, label: "GitHub" };
    case "auth0":
      return { icon: <MailboxIcon size={24} />, label: "Email" };
    default:
      return { icon: null, label: "" };
  }
};

const LockIcon = () => {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>lock</title>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
};

const AlertTriangleIcon = () => {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>alert triangle</title>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
};

const KeyIcon = () => {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>key</title>
      <path d="M15 9H15.01M15 15C18.3137 15 21 12.3137 21 9C21 5.68629 18.3137 3 15 3C11.6863 3 9 5.68629 9 9C9 9.27368 9.01832 9.54308 9.05381 9.80704C9.11218 10.2412 9.14136 10.4583 9.12172 10.5956C9.10125 10.7387 9.0752 10.8157 9.00469 10.9419C8.937 11.063 8.81771 11.1823 8.57913 11.4209L3.46863 16.5314C3.29568 16.7043 3.2092 16.7908 3.14736 16.8917C3.09253 16.9812 3.05213 17.0787 3.02763 17.1808C3 17.2959 3 17.4182 3 17.6627V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H6.33726C6.58185 21 6.70414 21 6.81923 20.9724C6.92127 20.9479 7.01881 20.9075 7.10828 20.8526C7.2092 20.7908 7.29568 20.7043 7.46863 20.5314L12.5791 15.4209C12.8177 15.1823 12.937 15.063 13.0581 14.9953C13.1843 14.9248 13.2613 14.8987 13.4044 14.8783C13.5417 14.8586 13.7588 14.8878 14.193 14.9462C14.4569 14.9817 14.7263 15 15 15Z" />
    </svg>
  );
};

const SectionKeyIcon = () => {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>key</title>
      <path d="M15 9H15.01M15 15C18.3137 15 21 12.3137 21 9C21 5.68629 18.3137 3 15 3C11.6863 3 9 5.68629 9 9C9 9.27368 9.01832 9.54308 9.05381 9.80704C9.11218 10.2412 9.14136 10.4583 9.12172 10.5956C9.10125 10.7387 9.0752 10.8157 9.00469 10.9419C8.937 11.063 8.81771 11.1823 8.57913 11.4209L3.46863 16.5314C3.29568 16.7043 3.2092 16.7908 3.14736 16.8917C3.09253 16.9812 3.05213 17.0787 3.02763 17.1808C3 17.2959 3 17.4182 3 17.6627V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H6.33726C6.58185 21 6.70414 21 6.81923 20.9724C6.92127 20.9479 7.01881 20.9075 7.10828 20.8526C7.2092 20.7908 7.29568 20.7043 7.46863 20.5314L12.5791 15.4209C12.8177 15.1823 12.937 15.063 13.0581 14.9953C13.1843 14.9248 13.2613 14.8987 13.4044 14.8783C13.5417 14.8586 13.7588 14.8878 14.193 14.9462C14.4569 14.9817 14.7263 15 15 15Z" />
    </svg>
  );
};

const EVM_COSMOS_CHAINS = [
  { name: "Ethereum", icon: <EthereumIcon width={16} height={16} /> },
  { name: "Base", icon: <BaseIcon width={16} height={16} /> },
  { name: "Arbitrum", icon: <ArbitrumIcon width={16} height={16} /> },
  { name: "Cosmos Hub", icon: <CosmosIcon width={16} height={16} /> },
  { name: "Initia", icon: <InitiaIcon width={16} height={16} /> },
  { name: "Zigchain", icon: <ZigchainIcon width={16} height={16} /> },
];

const SVM_CHAINS = [
  { name: "Solana", icon: <SolanaCircleIcon width={16} height={16} /> },
  // { name: "Rialo", icon: <RialoIcon width={16} height={16} /> },
];

const ChainsList = ({
  chains,
}: {
  chains: { name: string; icon: ReactNode }[];
}) => {
  return (
    <div className={styles.chainsList}>
      <div className={styles.chainsTitle}>
        <Typography size="xs" weight="semibold" color="secondary">
          Examples
        </Typography>
        <span className={styles.chainsSeparator} />
      </div>
      <div className={styles.chainsItems}>
        {chains.map((chain) => (
          <span key={chain.name} className={styles.chainItem}>
            {chain.icon}
            <Typography size="xs" weight="semibold" color="primary">
              {chain.name}
            </Typography>
          </span>
        ))}
      </div>
    </div>
  );
};

const Step1Content = ({
  authInfo,
  displayIdentifier,
  isLoading,
  onContinue,
}: {
  authInfo: { icon: ReactNode; label: string };
  displayIdentifier: string | null;
  isLoading: boolean;
  onContinue: () => void;
}) => {
  return (
    <>
      <Typography size="lg" weight="semibold" color="primary">
        Log in again to reveal your private key
      </Typography>

      <div className={styles.spacer24} />

      <div className={styles.loginSection}>
        <Typography
          size="xs"
          weight="semibold"
          color="secondary"
          className={styles.loginLabel}
        >
          You're logged in with:
        </Typography>
        <div className={styles.authCard}>
          <div className={styles.authCardRow}>
            {authInfo.icon}
            <Typography size="md" weight="semibold" color="primary">
              {authInfo.label}
            </Typography>
          </div>
          <Typography size="md" weight="medium" color="tertiary">
            {displayIdentifier}
          </Typography>
        </div>
      </div>

      <div className={styles.warningSection}>
        <div className={styles.warningItem}>
          <span className={styles.warningIconWrap}>
            <LockIcon />
          </span>
          <div className={styles.warningText}>
            <Typography size="md" weight="semibold" color="secondary">
              Keep your private key secret.
            </Typography>
            <Typography size="md" color="secondary">
              Anyone with it can take full control of your wallet and steal your
              funds.
            </Typography>
          </div>
        </div>
        <div className={styles.warningItem}>
          <span className={styles.warningIconWrap}>
            <AlertTriangleIcon />
          </span>
          <div className={styles.warningText}>
            <Typography size="md" weight="semibold" color="secondary">
              Using or importing this key outside Oko changes how the wallet is
              protected.
            </Typography>
            <Typography size="md" color="secondary">
              You'll be fully responsible for managing your wallet.
            </Typography>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        fullWidth
        isLoading={isLoading}
        disabled={isLoading}
        onClick={onContinue}
      >
        Continue
      </Button>
    </>
  );
};

const Step2Content = ({
  attachedOrigin,
  onReady,
  onError,
}: {
  attachedOrigin: string;
  onReady?: () => void;
  onError?: () => void;
}) => {
  const LOG = "[export][step2]";
  const [secpIframeHeight, setSecpIframeHeight] = useState(0);
  const [edIframeHeight, setEdIframeHeight] = useState(0);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== attachedOrigin) {
        return;
      }

      const data = event.data as OkoWalletProtectedMsgs;

      if (data?.target !== "oko_user_dashboard") {
        return;
      }

      if (!data?.payload) {
        return;
      }

      if (data.msg_type === "__export_display_resize__") {
        if (data.payload.key_type === "secp256k1") {
          setSecpIframeHeight(data.payload.height);
        } else if (data.payload.key_type === "ed25519") {
          setEdIframeHeight(data.payload.height);
        }
      } else if (data.msg_type === "__export_display_copy__") {
        displayToast({ variant: "success", title: "Copied!" });
      } else if (data.msg_type === "__export_display_copy_error__") {
        displayToast({
          variant: "confirm",
          title: "Copy Failed",
          description: "Could not copy to clipboard.",
        });
      } else if (data.msg_type === "__export_display_error__") {
        console.warn(`${LOG} display error: key_type=${data.payload.key_type}`);
        onError?.();
      }
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, [attachedOrigin, onError]);

  const iframesReady = secpIframeHeight > 0 && edIframeHeight > 0;

  const onReadyFired = useRef(false);
  const secpRef = useRef(secpIframeHeight);
  const edRef = useRef(edIframeHeight);
  const originRef = useRef(attachedOrigin);
  secpRef.current = secpIframeHeight;
  edRef.current = edIframeHeight;
  originRef.current = attachedOrigin;

  useEffect(() => {
    if (!onReady || onReadyFired.current) {
      return;
    }
    if (iframesReady) {
      onReadyFired.current = true;
      onReady();
      return;
    }
    const timer = setTimeout(() => {
      if (!onReadyFired.current) {
        console.warn(
          `${LOG} 20s timeout. secp=${secpRef.current}, ed=${edRef.current}`,
        );
        onReadyFired.current = true;
        onError?.();
      }
    }, 20000);
    return () => clearTimeout(timer);
  }, [iframesReady, onReady, onError]);

  return (
    <>
      {!iframesReady && (
        <div className={styles.step2Loading}>
          <Spinner size={32} />
        </div>
      )}
      <div
        style={{
          opacity: iframesReady ? 1 : 0,
          pointerEvents: iframesReady ? "auto" : "none",
        }}
      >
        <Typography size="lg" weight="semibold" color="primary">
          View and copy your private key
        </Typography>

        <div className={styles.spacer32} />

        {/* EVM & Cosmos Section */}
        <div className={styles.keySection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKeyIcon}>
              <SectionKeyIcon />
            </span>
            <Typography size="lg" weight="semibold" color="secondary">
              EVM & Cosmos
            </Typography>
          </div>

          <iframe
            src={`${attachedOrigin}/export/display?key_type=secp256k1&parent_origin=${encodeURIComponent(window.location.origin)}`}
            className={styles.keyIframe}
            style={secpIframeHeight ? { height: secpIframeHeight } : undefined}
            title="EVM & Cosmos private key"
            allow="clipboard-write"
          />

          <div className={styles.spacer24} />

          <ChainsList chains={EVM_COSMOS_CHAINS} />
        </div>

        <div className={styles.spacer52} />

        {/* Solana & SVM Section */}
        <div className={styles.keySection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKeyIcon}>
              <SectionKeyIcon />
            </span>
            <Typography size="lg" weight="semibold" color="secondary">
              Solana & SVM
            </Typography>
          </div>

          <iframe
            src={`${attachedOrigin}/export/display?key_type=ed25519&parent_origin=${encodeURIComponent(window.location.origin)}`}
            className={styles.keyIframe}
            style={edIframeHeight ? { height: edIframeHeight } : undefined}
            title="Solana & SVM private key"
            allow="clipboard-write"
          />

          <div className={styles.spacer24} />

          <ChainsList chains={SVM_CHAINS} />
        </div>

        <hr className={styles.divider} />

        {/* Info Box */}
        <div className={styles.infoBox}>
          <div className={styles.infoBoxTitle}>
            <InfoCircleIcon className={styles.infoBoxIcon} color="#414651" />
            <Typography size="sm" weight="semibold" color="tertiary">
              Why are there two keys?
            </Typography>
          </div>
          <Typography size="sm" weight="medium" color="quaternary">
            Different ecosystems use different cryptographic curves, so their
            private keys are generated differently.
          </Typography>
        </div>
      </div>
    </>
  );
};

const getExportErrorDescription = (errorType: string): string => {
  switch (errorType) {
    case "REAUTH_TIMEOUT":
      return "Re-authentication timed out. Please try again.";
    case "USER_MISMATCH":
      return "Account mismatch. Please log in with the same account.";
    case "USER_NOT_FOUND":
      return "User not found.";
    case "ED25519_KEYGEN_REQUIRED":
      return "Ed25519 key generation required. Please try signing in first.";
    case "NODES_BELOW_THRESHOLD":
      return "Service temporarily unavailable. Please try again later.";
    default:
      return "Please try again.";
  }
};

const Page = () => {
  const email = useUserInfoState((state) => state.email);
  const name = useUserInfoState((state) => state.name);
  const authType = useUserInfoState((state) => state.authType);
  const authInfo = getAuthProviderInfo(authType);
  const usesName =
    authType === "discord" ||
    authType === "telegram" ||
    authType === "x" ||
    authType === "github";
  const displayIdentifier = usesName ? name : email;

  const okoWallet = useOko().wallet;
  const attachedOrigin = okoWallet
    ? new URL(okoWallet.sdkEndpoint).origin
    : null;

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const handler = () => {
      setStep(1);
      setIsLoading(false);
    };
    window.addEventListener("oko:reset-export-step", handler);
    return () => window.removeEventListener("oko:reset-export-step", handler);
  }, []);

  const handlePopupClose = useCallback(() => {
    popupRef.current?.close();
    popupRef.current = null;
    setIsLoading(false);
  }, []);

  const handleExportDisplayError = useCallback(() => {
    setStep(1);
    setIsLoading(false);
    displayToast({
      variant: "confirm",
      title: "Export Failed",
      description: "Please try again.",
    });
  }, []);

  const handleContinue = useCallback(async () => {
    if (!okoWallet || !authType) {
      return;
    }

    let popup: Window | null = null;
    let reauthHandler: ((event: MessageEvent) => void) | null = null;
    let exportSucceeded = false;
    try {
      setIsLoading(true);

      // 1. Open re-auth popup at attached origin (match sign-in popup sizes)
      const attachedOrigin = new URL(okoWallet.sdkEndpoint).origin;
      const isOAuthProvider =
        authType === "google" ||
        authType === "x" ||
        authType === "discord" ||
        authType === "github";
      const popupWidth = isOAuthProvider ? 1200 : 440;
      const popupHeight = isOAuthProvider
        ? 800
        : authType === "telegram"
          ? 402
          : 285;
      const popupLeft = Math.max((window.screen.width - popupWidth) / 2, 0);
      const popupTop = Math.max((window.screen.height - popupHeight) / 2, 0);
      // Open about:blank first to avoid cross-origin popup blocking,
      // then redirect — same pattern as SDK sign-in handlers.
      popup = window.open(
        "about:blank",
        "oko_re_auth",
        `width=${popupWidth},height=${popupHeight},left=${popupLeft},top=${popupTop},resizable=yes`,
      );
      if (popup) {
        popup.location.href = `${attachedOrigin}/export/reauth?auth_type=${authType}&email=${encodeURIComponent(email ?? "")}&host_origin=${encodeURIComponent(window.location.origin)}`;
      }

      // 2. Send export request to attached iframe
      const resPromise = okoWallet.sendMsgToIframe({
        target: "oko_attached",
        msg_type: "__export_private_key__",
        payload: { auth_type: authType },
      } as any);

      // 3. Listen for re-auth completion signal from iframe
      let reauthReceived = false;
      reauthHandler = (event: MessageEvent) => {
        if (event.origin !== attachedOrigin) {
          return;
        }
        if (event.data?.msg_type === "__export_reauth_received__") {
          reauthReceived = true;
        }
      };
      window.addEventListener("message", reauthHandler);

      // 4. Monitor popup close — only reject if re-auth hasn't completed
      const popupClosePromise = new Promise<never>((_, reject) => {
        const timer = window.setInterval(() => {
          if (!popup || popup.closed) {
            window.clearInterval(timer);
            if (!reauthReceived) {
              reject(new Error("POPUP_CLOSED"));
            }
            // re-auth completed → popup close is expected, don't reject
          }
        }, 1000);
        void resPromise.finally(() => window.clearInterval(timer));
      });

      // 5. Backup timeout (in case export hangs after re-auth)
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error("EXPORT_TIMEOUT")),
          3 * 60 * 1000,
        );
        void resPromise.finally(() => clearTimeout(timer));
      });

      // 6. Wait for iframe result, popup close, or timeout
      const res = await Promise.race([
        resPromise,
        popupClosePromise,
        timeoutPromise,
      ]);

      // 7. Parse result
      const resAny = res as unknown as OkoWalletMsgExportPrivateKeyAck;

      if (
        resAny.msg_type === "__export_private_key_ack__" &&
        resAny.payload.success
      ) {
        // Popup closes itself after OAuth callback; Step2Content.onReady handles cleanup
        exportSucceeded = true;
        popupRef.current = popup;
        setStep(2);
      } else {
        popup?.close();
        const errorType = !resAny.payload.success
          ? resAny.payload.error.type
          : "unknown";
        const isMobile = window.innerWidth < 769;
        displayToast({
          variant: "confirm",
          title: "Login Failed!",
          description: getExportErrorDescription(errorType),
          toastOptions: isMobile ? { position: "bottom-center" } : undefined,
        });
      }
    } catch (error) {
      popup?.close();
      if (error instanceof Error && error.message === "POPUP_CLOSED") {
        return;
      }
      console.error("Export failed:", error);
      const description =
        error instanceof Error && error.message === "EXPORT_TIMEOUT"
          ? "Export timed out. Please try again."
          : "Please try again.";
      const isMobile = window.innerWidth < 769;
      displayToast({
        variant: "confirm",
        title: "Login Failed!",
        description,
        toastOptions: isMobile ? { position: "bottom-center" } : undefined,
      });
    } finally {
      if (reauthHandler) {
        window.removeEventListener("message", reauthHandler);
      }
      if (!exportSucceeded) {
        setIsLoading(false);
      }
    }
  }, [okoWallet, authType, email]);

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <span className={styles.headingIcon}>
          <KeyIcon />
        </span>
        <Typography size="xl" weight="semibold" color="primary">
          Export Private Key
        </Typography>
        <span className={styles.stepBadge}>
          <Typography size="xs" weight="medium" color="secondary">
            {step}/2
          </Typography>
        </span>
      </div>

      <div className={styles.content}>
        {step === 1 ? (
          <Step1Content
            authInfo={authInfo}
            displayIdentifier={displayIdentifier}
            isLoading={isLoading}
            onContinue={handleContinue}
          />
        ) : (
          <Step2Content
            attachedOrigin={attachedOrigin!}
            onReady={handlePopupClose}
            onError={handleExportDisplayError}
          />
        )}
      </div>
    </div>
  );
};

export default Page;
