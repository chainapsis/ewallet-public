"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { DiscordIcon } from "@oko-wallet/oko-common-ui/icons/discord_icon";
import { GoogleIcon } from "@oko-wallet/oko-common-ui/icons/google_icon";
import { MailboxIcon } from "@oko-wallet/oko-common-ui/icons/mailbox";
import { TelegramIcon } from "@oko-wallet/oko-common-ui/icons/telegram_icon";
import { XIcon } from "@oko-wallet/oko-common-ui/icons/x_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { type ReactNode, useCallback, useState } from "react";

import type { OkoWalletMsgExportPrivateKeyAck } from "../../../../../sdk/oko_sdk_core/dist/types";
import styles from "./page.module.scss";
import { displayToast } from "@oko-wallet-user-dashboard/components/toast";
import { useCopyToClipboard } from "@oko-wallet-user-dashboard/hooks/use_copy_to_clipboard";
import {
  selectCosmosSDK,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";

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
      width={28}
      height={28}
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

const CopyIcon = () => {
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
      <title>copy</title>
      <path d="M5 15C4.06812 15 3.60218 15 3.23463 14.8478C2.74458 14.6448 2.35523 14.2554 2.15224 13.7654C2 13.3978 2 12.9319 2 12V5.2C2 4.0799 2 3.51984 2.21799 3.09202C2.40973 2.71569 2.71569 2.40973 3.09202 2.21799C3.51984 2 4.0799 2 5.2 2H12C12.9319 2 13.3978 2 13.7654 2.15224C14.2554 2.35523 14.6448 2.74458 14.8478 3.23463C15 3.60218 15 4.06812 15 5M12.2 22H18.8C19.9201 22 20.4802 22 20.908 21.782C21.2843 21.5903 21.5903 21.2843 21.782 20.908C22 20.4802 22 19.9201 22 18.8V12.2C22 11.0799 22 10.5198 21.782 10.092C21.5903 9.71569 21.2843 9.40973 20.908 9.21799C20.4802 9 19.9201 9 18.8 9H12.2C11.0799 9 10.5198 9 10.092 9.21799C9.71569 9.40973 9.40973 9.71569 9.21799 10.092C9 10.5198 9 11.0799 9 12.2V18.8C9 19.9201 9 20.4802 9.21799 20.908C9.40973 21.2843 9.71569 21.5903 10.092 21.782C10.5198 22 11.0799 22 12.2 22Z" />
    </svg>
  );
};

const EyeOffIcon = () => {
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
      <title>eye off</title>
      <path d="M10.7429 5.09232C11.1494 5.03223 11.5686 5 12.0004 5C17.1054 5 20.4553 9.50484 21.5807 11.2868C21.7169 11.5025 21.785 11.6103 21.8231 11.7767C21.8518 11.9016 21.8518 12.0987 21.8231 12.2236C21.785 12.3899 21.7164 12.4985 21.5792 12.7156C21.2793 13.1901 20.8222 13.8571 20.2165 14.5805M6.72432 6.71504C4.56225 8.1817 3.09445 10.2194 2.42111 11.2853C2.28428 11.5019 2.21587 11.6102 2.17774 11.7765C2.1491 11.9014 2.14909 12.0984 2.17771 12.2234C2.21583 12.3897 2.28393 12.4975 2.42013 12.7132C3.54554 14.4952 6.89541 19 12.0004 19C14.0588 19 15.8319 18.2676 17.2888 17.2766M3.00042 3L21.0004 21M9.8791 9.87868C9.3362 10.4216 9.00042 11.1716 9.00042 12C9.00042 13.6569 10.3436 15 12.0004 15C12.8288 15 13.5788 14.6642 14.1218 14.1213" />
    </svg>
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

      <div style={{ height: 24 }} />

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

      <Button size="lg" fullWidth isLoading={isLoading} onClick={onContinue}>
        Continue
      </Button>
    </>
  );
};

const Step2Content = ({
  privateKeys,
  revealedKeys,
  onToggleReveal,
  onCopy,
}: {
  privateKeys: { secp256k1: string; ed25519: string };
  revealedKeys: { secp256k1: boolean; ed25519: boolean };
  onToggleReveal: (key: "secp256k1" | "ed25519") => void;
  onCopy: (key: string) => void;
}) => {
  return (
    <>
      <Typography size="lg" weight="semibold" color="primary">
        View and copy your private keys
      </Typography>

      <div style={{ height: 24 }} />

      <div className={styles.privateKeySection}>
        <Typography
          size="xs"
          weight="semibold"
          color="secondary"
          className={styles.privateKeyLabel}
        >
          EVM/Cosmos Private Key
        </Typography>
        <div
          className={styles.privateKeyField}
          onClick={() => onToggleReveal("secp256k1")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onToggleReveal("secp256k1");
            }
          }}
        >
          <div className={styles.privateKeyBg}>
            <Typography
              size="md"
              weight="medium"
              color="secondary"
              className={
                revealedKeys.secp256k1
                  ? undefined
                  : styles.privateKeyTextBlurred
              }
            >
              {privateKeys.secp256k1}
            </Typography>
          </div>
          {!revealedKeys.secp256k1 && (
            <div className={styles.privateKeyHint}>
              <span className={styles.eyeOffIcon}>
                <EyeOffIcon />
              </span>
              <Typography size="md" weight="medium" color="primary">
                Click or tap to reveal your private key.
                <br />
                Ensure no one else can see your screen.
              </Typography>
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 32 }} />

      <Button size="lg" fullWidth onClick={() => onCopy(privateKeys.secp256k1)}>
        <span className={styles.copyButtonIcon}>
          <CopyIcon />
        </span>
        Copy to Clipboard
      </Button>

      <div style={{ height: 40 }} />

      <div className={styles.privateKeySection}>
        <Typography
          size="xs"
          weight="semibold"
          color="secondary"
          className={styles.privateKeyLabel}
        >
          SVM Private Key
        </Typography>
        <div
          className={styles.privateKeyField}
          onClick={() => onToggleReveal("ed25519")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onToggleReveal("ed25519");
            }
          }}
        >
          <div className={styles.privateKeyBg}>
            <Typography
              size="md"
              weight="medium"
              color="secondary"
              className={
                revealedKeys.ed25519 ? undefined : styles.privateKeyTextBlurred
              }
            >
              {privateKeys.ed25519}
            </Typography>
          </div>
          {!revealedKeys.ed25519 && (
            <div className={styles.privateKeyHint}>
              <span className={styles.eyeOffIcon}>
                <EyeOffIcon />
              </span>
              <Typography size="md" weight="medium" color="primary">
                Click or tap to reveal your private key.
                <br />
                Ensure no one else can see your screen.
              </Typography>
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 32 }} />

      <Button size="lg" fullWidth onClick={() => onCopy(privateKeys.ed25519)}>
        <span className={styles.copyButtonIcon}>
          <CopyIcon />
        </span>
        Copy to Clipboard
      </Button>
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
    authType === "discord" || authType === "telegram" || authType === "x";
  const displayIdentifier = usesName ? name : email;

  const okoWallet = useSDKState(selectCosmosSDK)?.okoWallet;

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState({
    secp256k1: false,
    ed25519: false,
  });
  const [privateKeys, setPrivateKeys] = useState<{
    secp256k1: string;
    ed25519: string;
  } | null>(null);
  const { copy } = useCopyToClipboard();

  const handleContinue = useCallback(async () => {
    if (!okoWallet || !authType) {
      return;
    }

    let popup: Window | null = null;
    let reauthHandler: ((event: MessageEvent) => void) | null = null;
    try {
      setIsLoading(true);

      // 1. Open re-auth popup at attached origin (match sign-in popup sizes)
      const attachedOrigin = new URL(okoWallet.sdkEndpoint).origin;
      const isOAuthProvider =
        authType === "google" || authType === "x" || authType === "discord";
      const popupWidth = isOAuthProvider ? 1200 : 440;
      const popupHeight = isOAuthProvider
        ? 800
        : authType === "telegram"
          ? 402
          : 285;
      const popupLeft = Math.max((window.screen.width - popupWidth) / 2, 0);
      const popupTop = Math.max((window.screen.height - popupHeight) / 2, 0);
      popup = window.open(
        `${attachedOrigin}/export/reauth?auth_type=${authType}`,
        "oko_re_auth",
        `width=${popupWidth},height=${popupHeight},left=${popupLeft},top=${popupTop},resizable=yes`,
      );

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
      popup?.close();

      // 5. Parse result
      const resAny = res as unknown as OkoWalletMsgExportPrivateKeyAck;

      if (
        resAny.msg_type === "__export_private_key_ack__" &&
        resAny.payload.success
      ) {
        setPrivateKeys(resAny.payload.data);
        setStep(2);
      } else {
        const errorType = !resAny.payload.success
          ? resAny.payload.error.type
          : "unknown";
        displayToast({
          variant: "confirm",
          title: "Export Failed",
          description: getExportErrorDescription(errorType),
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
      displayToast({
        variant: "confirm",
        title: "Export Failed",
        description,
      });
    } finally {
      if (reauthHandler) {
        window.removeEventListener("message", reauthHandler);
      }
      setIsLoading(false);
    }
  }, [okoWallet, authType]);

  const handleCopy = useCallback(
    async (key: string) => {
      const success = await copy(key);
      if (success) {
        displayToast({ variant: "success", title: "Copied!" });
      }
    },
    [copy],
  );

  const handleToggleReveal = useCallback((key: "secp256k1" | "ed25519") => {
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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
            privateKeys={privateKeys!}
            revealedKeys={revealedKeys}
            onToggleReveal={handleToggleReveal}
            onCopy={handleCopy}
          />
        )}
      </div>
    </div>
  );
};

export default Page;
