import { Button } from "@oko-wallet/oko-common-ui/button";
import type { OkoWalletProtectedMsgs } from "@oko-wallet/oko-sdk-core";
import type { CurveType } from "@oko-wallet/oko-types/crypto";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";

import styles from "./export_display.module.scss";
import { postLog } from "@oko-wallet-attached/requests/logging";
import {
  type ExportedKeys,
  getExportedKeys,
  requestExportedKeys,
} from "@oko-wallet-attached/window_msgs/export_key_store";

const LOG = "[attached][export_display]";

// Module-level: fires as soon as the route chunk is evaluated
console.log(`${LOG} module loaded, url=${window.location.href}`);
postLog({
  level: "info",
  message: `${LOG} module loaded`,
  meta: { url: window.location.href },
});

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
console.log(`${LOG} parentOrigin=${parentOrigin}`);

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

const CopyIcon = () => {
  return (
    <svg
      width={20}
      height={20}
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
const MAX_KEY_REQUEST_ATTEMPTS = 3;

export const ExportDisplay: FC = () => {
  console.log(`${LOG} component render`);

  const keyType = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("key_type");
    const parsed = raw && VALID_KEY_TYPES.has(raw) ? (raw as CurveType) : null;
    console.log(`${LOG} keyType parsed: raw=${raw}, result=${parsed}`);
    return parsed;
  }, []);

  const [revealed, setRevealed] = useState(false);
  const [keys, setKeys] = useState<ExportedKeys | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  // Read keys: try local first, then request from hidden iframe via postMessage
  useEffect(() => {
    let cancelled = false;

    const loadKeys = async () => {
      console.log(`${LOG} loadKeys() start`);
      postLog({
        level: "info",
        message: `${LOG} loadKeys() start`,
        meta: { keyType },
      });

      let stored = getExportedKeys();
      console.log(`${LOG} getExportedKeys() local: ${stored ? "found" : "null"}`);

      if (!stored) {
        // Retry up to 3 times (2s each) to handle timing variance across devices
        for (
          let attempt = 0;
          attempt < MAX_KEY_REQUEST_ATTEMPTS && !stored && !cancelled;
          attempt += 1
        ) {
          console.log(`${LOG} requestExportedKeys() attempt ${attempt + 1}/${MAX_KEY_REQUEST_ATTEMPTS}`);
          stored = await requestExportedKeys();
          console.log(`${LOG} requestExportedKeys() attempt ${attempt + 1} result: ${stored ? "found" : "null"}`);
        }
      }
      if (cancelled) {
        console.log(`${LOG} loadKeys() cancelled`);
        return;
      }

      const framesCount = (() => {
        try {
          return window.parent?.frames?.length ?? -1;
        } catch {
          return -1;
        }
      })();

      if (!stored) {
        postLog({
          level: "error",
          message: "export_display: key load failed after retries",
          error: {
            name: "ExportDisplayError",
            message: "No keys received from hidden iframe",
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
      console.log(`${LOG} keys loaded successfully, available keys: ${Object.keys(stored).join(", ")}`);
      postLog({
        level: "info",
        message: `${LOG} keys loaded`,
        meta: { keyType, availableKeys: Object.keys(stored), framesCount },
      });

      if (!keyType || !(keyType in stored)) {
        postLog({
          level: "error",
          message: "export_display: invalid key type",
          error: {
            name: "ExportDisplayError",
            message: `key_type=${keyType} not found in exported keys`,
          },
          meta: { keyType, availableKeys: Object.keys(stored) },
        });

        postToParent({
          target: "oko_user_dashboard",
          msg_type: "__export_display_error__",
          payload: { key_type: keyType },
        });

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
      console.log(`${LOG} ResizeObserver skipped — containerEl is null`);
      return;
    }

    console.log(`${LOG} ResizeObserver setup for keyType=${keyType}`);

    const report = () => {
      const h = containerEl.offsetHeight;
      console.log(`${LOG} reporting height: keyType=${keyType}, height=${h}`);

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
    postLog({
      level: "info",
      message: `${LOG} ResizeObserver started`,
      meta: { keyType, initialHeight: containerEl.offsetHeight, parentOrigin },
    });

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
  }, [keys, keyType]);

  if (error) {
    console.warn(`${LOG} rendering error state: ${error}`);
    return <div className={styles.error}>{error}</div>;
  }

  if (!keys || !keyType) {
    console.log(`${LOG} rendering null — keys=${!!keys}, keyType=${keyType}`);
    return null;
  }

  console.log(`${LOG} rendering key display for keyType=${keyType}`);

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

      <div className={styles.spacer16} />

      <Button
        size="lg"
        fullWidth
        onClick={handleCopy}
        className={styles.copyButton}
      >
        <span className={styles.copyButtonIcon}>
          <CopyIcon />
        </span>
        Copy to Clipboard
      </Button>
    </div>
  );
};
