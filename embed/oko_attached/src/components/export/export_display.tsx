import { CopyButton } from "@oko-wallet/oko-common-ui/copy_button";
import type { OkoWalletProtectedMsgs } from "@oko-wallet/oko-sdk-core";
import type { CurveType } from "@oko-wallet/oko-types/crypto";
import {
  type FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./export_display.module.scss";
import { postLog } from "@oko-wallet-attached/requests/logging";
import {
  clearExportedKeys,
  consumeExportedKey,
  requestExportedKey,
} from "@oko-wallet-attached/window_msgs/export_key_store";

const LOG = "[attached][export_display]";

function getParentOrigin(): string {
  const raw = new URLSearchParams(window.location.search).get("parent_origin");
  if (!raw) {
    console.warn(`${LOG} parent_origin param missing, defaulting to *`);
    return "*";
  }
  try {
    return new URL(raw).origin;
  } catch {
    console.warn(`${LOG} parent_origin parse failed: ${raw}`);
    return "*";
  }
}

const parentOrigin = getParentOrigin();

function postToParent(msg: OkoWalletProtectedMsgs) {
  window.parent.postMessage(
    { target: msg.target, msg_type: msg.msg_type, payload: msg.payload },
    parentOrigin,
  );
}

const EyeOffIcon: FC = () => {
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
      <title>hidden</title>
      <path d="M10.7429 5.09232C11.1494 5.03223 11.5686 5 12.0004 5C17.1054 5 20.4553 9.50484 21.5807 11.2868C21.7169 11.5025 21.785 11.6103 21.8231 11.7767C21.8518 11.9016 21.8518 12.0987 21.8231 12.2236C21.785 12.3899 21.7164 12.4985 21.5794 12.7156C21.2951 13.1642 20.8501 13.8245 20.2444 14.5455M6.72432 6.71504C4.56225 8.1817 3.09445 10.2194 2.42111 11.2853C2.28428 11.5019 2.21587 11.6102 2.17774 11.7765C2.1491 11.9014 2.14909 12.0984 2.17771 12.2234C2.21583 12.3897 2.28393 12.4975 2.42013 12.7132C3.54554 14.4952 6.89541 19 12.0004 19C14.0588 19 15.8319 18.2676 17.2888 17.2766M3.00042 3L21.0004 21M9.8791 9.87868C9.3362 10.4216 9.00042 11.1716 9.00042 12C9.00042 13.6569 10.3436 15 12.0004 15C12.8288 15 13.5788 14.6642 14.1218 14.1213" />
    </svg>
  );
};

const VALID_KEY_TYPES: ReadonlySet<string> = new Set(["secp256k1", "ed25519"]);
const MAX_KEY_REQUEST_ATTEMPTS = 3;

export const ExportDisplay: FC = () => {
  // Force light theme — this route is loaded directly (not through AttachedInitialized),
  // so the SDK theme URL param is not available here.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => {
      if (prevTheme) {
        root.setAttribute("data-theme", prevTheme);
      } else {
        root.removeAttribute("data-theme");
      }
    };
  }, []);

  const keyType = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("key_type");
    const parsed = raw && VALID_KEY_TYPES.has(raw) ? (raw as CurveType) : null;
    return parsed;
  }, []);

  const [revealed, setRevealed] = useState(false);
  const [keyValue, setKeyValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read key: try local first, then request from hidden iframe via postMessage
  useEffect(() => {
    if (!keyType) {
      setError("Invalid key_type");
      return;
    }

    let cancelled = false;

    const loadKey = async () => {
      let key = consumeExportedKey(keyType);

      if (!key) {
        // Retry up to 3 times (2s each) to handle timing variance across devices
        for (
          let attempt = 0;
          attempt < MAX_KEY_REQUEST_ATTEMPTS && !key && !cancelled;
          attempt += 1
        ) {
          key = await requestExportedKey(keyType);
        }
      }
      if (cancelled) {
        return;
      }

      if (!key) {
        const framesCount = (() => {
          try {
            return window.parent?.frames?.length ?? -1;
          } catch {
            return -1;
          }
        })();

        postLog({
          level: "error",
          message: "export_display: key load failed after retries",
          error: {
            name: "ExportDisplayError",
            message: `No key received for ${keyType}`,
          },
          meta: {
            keyType,
            attempts: MAX_KEY_REQUEST_ATTEMPTS,
            framesCount,
            parentOrigin,
          },
        });
        postToParent({
          target: "oko_user_dashboard",
          msg_type: "__export_display_error__",
          payload: { key_type: keyType },
        });
        setError("No exported keys found.");
        return;
      }
      setKeyValue(key);
    };

    loadKey();

    return () => {
      cancelled = true;
      setKeyValue(null);
      clearExportedKeys();
    };
  }, [keyType]);

  // ResizeObserver → notify parent of height changes
  useEffect(() => {
    if (!containerEl) {
      return;
    }

    const report = () => {
      const h = containerEl.offsetHeight;

      postToParent({
        target: "oko_user_dashboard",
        msg_type: "__export_display_resize__",
        payload: {
          height: h,
          key_type: keyType,
        },
      });
    };

    const observer = new ResizeObserver(report);
    observer.observe(containerEl);

    // Send initial height immediately — ResizeObserver initial callback
    // may not fire reliably in cross-origin iframes in some environments
    report();

    return () => {
      observer.disconnect();
    };
  }, [keyType, containerEl]);

  const handleToggleReveal = useCallback(() => {
    setRevealed((prev) => !prev);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!keyValue || !keyType) {
      return;
    }

    try {
      await navigator.clipboard.writeText(keyValue);

      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      setIsCopied(true);
      copyTimerRef.current = setTimeout(() => {
        setIsCopied(false);
        copyTimerRef.current = null;
      }, 1500);

      postToParent({
        target: "oko_user_dashboard",
        msg_type: "__export_display_copy__",
        payload: { key_type: keyType },
      });
    } catch {
      postToParent({
        target: "oko_user_dashboard",
        msg_type: "__export_display_copy_error__",
        payload: { key_type: keyType },
      });
    }
  }, [keyValue, keyType]);

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!keyValue || !keyType) {
    return null;
  }

  return (
    <div ref={setContainerEl} className={styles.container}>
      <div
        className={styles.privateKeyField}
        onClick={handleToggleReveal}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleToggleReveal();
          }
        }}
      >
        <div className={styles.privateKeyBg}>
          <span
            className={`${styles.privateKeyText} ${
              !revealed ? styles.privateKeyTextBlurred : ""
            }`}
          >
            {keyValue}
          </span>
        </div>
        {!revealed && (
          <div className={styles.privateKeyHint}>
            <span className={styles.eyeOffIcon}>
              <EyeOffIcon />
            </span>
            <span className={styles.hintText}>
              Click or tap to reveal your private key.
              <br />
              Ensure no one else can see your screen.
            </span>
          </div>
        )}
      </div>

      <div className={styles.spacer16} />
      <CopyButton
        size="lg"
        fullWidth
        isCopied={isCopied}
        onClick={handleCopy}
        className={styles.copyButton}
        iconSize={20}
        defaultColor="var(--brand-300)"
        successColor="var(--brand-300)"
      >
        Copy to Clipboard
      </CopyButton>
    </div>
  );
};
