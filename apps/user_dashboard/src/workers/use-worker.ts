import { useCallback, useEffect, useRef, useState } from "react";

import type { WorkerMessage } from "./types";
import { WorkerBridge } from "./worker-bridge";

interface UseWorkerOptions {
  maxPending?: number;
}

interface UseWorkerReturn<
  TReq extends WorkerMessage,
  TRes extends WorkerMessage,
> {
  request: (msg: TReq, timeout?: number) => Promise<TRes>;
  error: Error | null;
}

export function useWorker<
  TReq extends WorkerMessage,
  TRes extends WorkerMessage,
>(
  factory: () => Worker,
  options?: UseWorkerOptions,
): UseWorkerReturn<TReq, TRes> {
  const bridgeRef = useRef<WorkerBridge<TReq, TRes> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const worker = factory();
    const bridge = new WorkerBridge<TReq, TRes>(worker, options);
    bridgeRef.current = bridge;

    bridge.onError((err) => setError(err));

    return () => {
      bridge.terminate();
      bridgeRef.current = null;
    };
  }, []);

  const request = useCallback((msg: TReq, timeout?: number): Promise<TRes> => {
    if (!bridgeRef.current) {
      return Promise.reject(new Error("Worker not available"));
    }
    return bridgeRef.current.request(msg, timeout);
  }, []);

  return { request, error };
}
