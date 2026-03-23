import type {
  WorkerEnvelope,
  WorkerErrorPayload,
  WorkerMessage,
} from "./types";
import { RESERVED_TYPES } from "./types";

declare const self: {
  addEventListener(type: "message", listener: (ev: MessageEvent) => void): void;
  postMessage(message: unknown): void;
};

class WorkerRouter<TReq extends WorkerMessage, TRes extends WorkerMessage> {
  private handlers: Map<string, (msg: any) => Promise<TRes>> = new Map();

  route(type: string, handler: (msg: any) => Promise<TRes>): void {
    if (RESERVED_TYPES.some((reserved) => reserved === type)) {
      throw new Error(`Reserved type: ${type}`);
    }
    if (this.handlers.has(type)) {
      throw new Error(`Duplicate handler: ${type}`);
    }
    this.handlers.set(type, handler);
  }

  handle(msg: TReq): Promise<TRes> {
    const handler = this.handlers.get(msg.type);
    if (!handler) {
      throw new Error(`Unknown message type: ${msg.type}`);
    }
    return handler(msg);
  }
}

export function createWorkerHandler<
  TReq extends WorkerMessage,
  TRes extends WorkerMessage,
>(setup: (router: WorkerRouter<TReq, TRes>) => void): void {
  const router = new WorkerRouter<TReq, TRes>();
  setup(router);

  self.addEventListener(
    "message",
    async (e: MessageEvent<WorkerEnvelope<TReq>>) => {
      const { _id, payload } = e.data;
      try {
        const result = await router.handle(payload);
        if (result) {
          self.postMessage({ _id, payload: result });
        }
      } catch (err) {
        const errorPayload: WorkerErrorPayload = {
          type: "__WORKER_ERROR__",
          message: err instanceof Error ? err.message : String(err),
        };
        self.postMessage({ _id, payload: errorPayload });
      }
    },
  );
}
