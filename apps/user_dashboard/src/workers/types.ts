export interface WorkerMessage {
  type: string;
}

export interface WorkerEnvelope<T extends WorkerMessage> {
  _id: string;
  payload: T;
}

export interface WorkerErrorPayload extends WorkerMessage {
  type: "__WORKER_ERROR__";
  message: string;
}

export const RESERVED_TYPES = ["__WORKER_ERROR__"] as const;
