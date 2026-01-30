import { EventEmitter } from "eventemitter3";

import type {
  SvmWalletEvent,
  SvmWalletEventHandler,
  SvmWalletEventMap,
} from "./types";

export class SvmWalletEventEmitter extends EventEmitter<SvmWalletEvent> {
  on<K extends SvmWalletEvent>(
    event: K,
    handler: SvmWalletEventHandler<K>,
  ): this {
    return super.on(event, handler as (...args: unknown[]) => void);
  }

  once<K extends SvmWalletEvent>(
    event: K,
    handler: SvmWalletEventHandler<K>,
  ): this {
    return super.once(event, handler as (...args: unknown[]) => void);
  }

  off<K extends SvmWalletEvent>(
    event: K,
    handler: SvmWalletEventHandler<K>,
  ): this {
    return super.off(event, handler as (...args: unknown[]) => void);
  }

  emit<K extends SvmWalletEvent>(
    event: K,
    ...args: SvmWalletEventMap[K] extends void ? [] : [SvmWalletEventMap[K]]
  ): boolean {
    return super.emit(event, ...args);
  }

  addListener<K extends SvmWalletEvent>(
    event: K,
    handler: SvmWalletEventHandler<K>,
  ): this {
    return this.on(event, handler);
  }

  removeListener<K extends SvmWalletEvent>(
    event: K,
    handler: SvmWalletEventHandler<K>,
  ): this {
    return this.off(event, handler);
  }
}
