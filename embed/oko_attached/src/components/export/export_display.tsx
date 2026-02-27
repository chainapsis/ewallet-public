import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type ExportedKeys,
  getExportedKeys,
  requestExportedKeys,
} from "@oko-wallet-attached/window_msgs/export_key_store";

import styles from "./export_display.module.scss";

type KeyType = "secp256k1" | "ed25519";

const PARENT_MSG_TARGET = "oko_user_dashboard";

function postToParent(msgType: string, data?: Record<string, unknown>) {
  window.parent.postMessage(
    { target: PARENT_MSG_TARGET, msg_type: msgType, ...data },
    "*",
  );
}

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
      <title>hidden</title>
      <path d="M10.7429 5.09232C11.1494 5.03223 11.5686 5 12.0004 5C17.1054 5 20.4553 9.50484 21.5807 11.2868C21.7169 11.5025 21.785 11.6103 21.8231 11.7767C21.8518 11.9016 21.8518 12.0987 21.8231 12.2236C21.785 12.3899 21.7164 12.4985 21.5794 12.7156C21.2951 13.1642 20.8501 13.8245 20.2444 14.5455M6.72432 6.71504C4.56225 8.1817 3.09445 10.2194 2.42111 11.2853C2.28428 11.5019 2.21587 11.6102 2.17774 11.7765C2.1491 11.9014 2.14909 12.0984 2.17771 12.2234C2.21583 12.3897 2.28393 12.4975 2.42013 12.7132C3.54554 14.4952 6.89541 19 12.0004 19C14.0588 19 15.8319 18.2676 17.2888 17.2766M3.00042 3L21.0004 21M9.8791 9.87868C9.3362 10.4216 9.00042 11.1716 9.00042 12C9.00042 13.6569 10.3436 15 12.0004 15C12.8288 15 13.5788 14.6642 14.1218 14.1213" />
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

const VALID_KEY_TYPES: ReadonlySet<string> = new Set(["secp256k1", "ed25519"]);

export const ExportDisplay = () => {
  const keyType = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("key_type");
    return raw && VALID_KEY_TYPES.has(raw) ? (raw as KeyType) : null;
  }, []);

  const [revealed, setRevealed] = useState(false);
  const [keys, setKeys] = useState<ExportedKeys | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  // Read keys: try local first, then request from hidden iframe via BroadcastChannel
  useEffect(() => {
    let cancelled = false;

    const loadKeys = async () => {
      let stored = getExportedKeys();
      if (!stored) {
        stored = await requestExportedKeys();
      }
      if (cancelled) {
        return;
      }
      if (!stored) {
        setError("No exported keys found.");
        return;
      }
      if (!keyType || !(keyType in stored)) {
        setError(`Invalid key_type: ${keyType}`);
        return;
      }
      setKeys(stored);
    };

    loadKeys();

    return () => {
      cancelled = true;
    };
  }, [keyType]);

  // ResizeObserver → notify parent of height changes
  useEffect(() => {
    if (!containerEl) {
      return;
    }

    const report = () => {
      postToParent("__export_display_resize__", {
        height: document.documentElement.scrollHeight,
        key_type: keyType,
      });
    };
    const observer = new ResizeObserver(report);
    observer.observe(containerEl);

    return () => {
      observer.disconnect();
    };
  }, [keyType, containerEl]);

  const handleToggleReveal = useCallback(() => {
    setRevealed((prev) => !prev);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!keys || !keyType) {
      return;
    }
    const keyValue = keys[keyType];
    try {
      await navigator.clipboard.writeText(keyValue);
      postToParent("__export_display_copied__", { key_type: keyType });
    } catch {
      postToParent("__export_display_copy_failed__", { key_type: keyType });
    }
  }, [keys, keyType]);

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!keys || !keyType) {
    return null;
  }

  const keyValue = keys[keyType];

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

      <div style={{ height: 16 }} />

      <button
        type="button"
        className={styles.copyButton}
        onClick={handleCopy}
      >
        <span className={styles.copyButtonIcon}>
          <CopyIcon />
        </span>
        Copy to Clipboard
      </button>
    </div>
  );
};
