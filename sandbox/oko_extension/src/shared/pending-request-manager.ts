/**
 * Generic Pending Request Manager
 *
 * Unified handler for async request/response patterns with timeout support.
 * Used by both background service worker and injected providers.
 */

export interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class PendingRequestManager<T = unknown> {
  private _requests = new Map<string, PendingRequest<T>>();
  private _defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 300000) {
    this._defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Add a pending request with automatic timeout
   */
  add(
    id: string,
    resolve: (value: T) => void,
    reject: (reason: unknown) => void,
    timeoutMs?: number
  ): void {
    const timeout = setTimeout(() => {
      this._requests.delete(id);
      reject(new Error("Request timeout"));
    }, timeoutMs ?? this._defaultTimeoutMs);

    this._requests.set(id, { resolve, reject, timeout });
  }

  /**
   * Resolve a pending request with data
   * @returns true if request was found and resolved
   */
  resolve(id: string, data: T): boolean {
    const pending = this._requests.get(id);
    if (pending) {
      clearTimeout(pending.timeout);
      this._requests.delete(id);
      pending.resolve(data);
      return true;
    }
    return false;
  }

  /**
   * Reject a pending request with error
   * @returns true if request was found and rejected
   */
  reject(id: string, error: unknown): boolean {
    const pending = this._requests.get(id);
    if (pending) {
      clearTimeout(pending.timeout);
      this._requests.delete(id);
      pending.reject(error);
      return true;
    }
    return false;
  }

  /**
   * Check if a request is pending
   */
  has(id: string): boolean {
    return this._requests.has(id);
  }

  /**
   * Get count of pending requests
   */
  get size(): number {
    return this._requests.size;
  }

  /**
   * Clear all pending requests (rejects them)
   */
  clear(error = new Error("Requests cleared")): void {
    for (const [id, pending] of this._requests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this._requests.clear();
  }
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
