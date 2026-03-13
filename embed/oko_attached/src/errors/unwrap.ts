import type { Result } from "@oko-wallet/stdlib-js";
import { useEffect } from "react";

import type { AppError } from ".";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

export function useUnwrap(res: Result<any, AppError>) {
  const { setError } = useMemoryState();

  useEffect(() => {
    if (!res.success) {
      setError(res.err);
    }
  }, [res]);
}
