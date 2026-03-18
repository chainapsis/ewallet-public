import { useCallback, useRef, useState } from "react";

import { displayToast } from "@oko-wallet-user-dashboard/components/toast";

const COPIED_RESET_DELAY_MS = 1500;

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!text) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setIsCopied(true);
      timerRef.current = setTimeout(() => {
        setIsCopied(false);
        timerRef.current = null;
      }, COPIED_RESET_DELAY_MS);

      displayToast({ variant: "success", title: "Copied!" });
      return true;
    } catch {
      return false;
    }
  }, []);

  return { isCopied, copy };
}
