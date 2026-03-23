import type { WorkerEnvelope, WorkerMessage } from "./types";

function isWorkerError(
  payload: WorkerMessage,
): payload is WorkerMessage & { type: "__WORKER_ERROR__"; message: string } {
  return payload.type === "__WORKER_ERROR__";
}

type WorkerErrorOrResponse<TRes extends WorkerMessage> =
  | TRes
  | (WorkerMessage & { type: "__WORKER_ERROR__"; message: string });

export class WorkerBridge<
  TReq extends WorkerMessage,
  TRes extends WorkerMessage,
> {
  private worker: Worker;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: TRes) => void;
      reject: (reason: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private errorHandler: ((err: Error) => void) | null = null;
  private idCounter = 0;
  private terminated = false;
  private MAX_PENDING: number;

  constructor(worker: Worker, options?: { maxPending?: number }) {
    this.worker = worker;
    this.MAX_PENDING = options?.maxPending ?? 100;

    this.worker.onmessage = (
      e: MessageEvent<WorkerEnvelope<WorkerErrorOrResponse<TRes>>>,
    ) => {
      const { _id, payload } = e.data;

      // Security #1: Response validation
      if (!payload || typeof payload.type !== "string") {
        const error = new Error(
          "Malformed worker response: missing or invalid payload.type",
        );
        const pending = this.pendingRequests.get(_id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(_id);
          pending.reject(error);
        }
        this.errorHandler?.(error);
        return;
      }

      const pending = this.pendingRequests.get(_id);
      if (!pending) {
        return;
      }

      clearTimeout(pending.timer);
      this.pendingRequests.delete(_id);

      if (isWorkerError(payload)) {
        pending.reject(new Error(payload.message));
      } else {
        pending.resolve(payload);
      }
    };

    this.worker.onerror = (e: ErrorEvent) => {
      const error = new Error(
        `Worker error: ${e.message} (${e.filename}:${e.lineno})`,
      );
      this.errorHandler?.(error);
    };
  }

  request(msg: TReq, timeout = 30_000): Promise<TRes> {
    if (this.terminated) {
      return Promise.reject(new Error("Worker terminated"));
    }

    if (this.pendingRequests.size >= this.MAX_PENDING) {
      return Promise.reject(
        new Error(
          `Max pending requests (${this.MAX_PENDING}) reached. Possible causes: worker is unresponsive, or requests are being sent faster than processed.`,
        ),
      );
    }

    const _id = String(++this.idCounter);

    return new Promise<TRes>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(_id);
        reject(new Error(`Worker request timed out after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(_id, { resolve, reject, timer });
      this.worker.postMessage({ _id, payload: msg });
    });
  }

  onError(handler: (err: Error) => void): void {
    this.errorHandler = handler;
  }

  terminate(): void {
    this.terminated = true;

    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Worker terminated"));
    }

    this.pendingRequests.clear();
    this.worker.terminate();
  }
}
