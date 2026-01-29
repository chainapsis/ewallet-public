import { useCallback, useState } from "react";

const COPIED_RESET_DELAY_MS = 1500;

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!text) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), COPIED_RESET_DELAY_MS);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { isCopied, copy };
}
