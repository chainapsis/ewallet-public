import type { PublicKey } from "@solana/web3.js";

export type SvmWalletEventMap = {
  connect: PublicKey;
  disconnect: undefined;
  accountChanged: PublicKey | null;
  error: Error;
};

export type SvmWalletEvent = keyof SvmWalletEventMap;

export type SvmWalletEventHandler<K extends SvmWalletEvent> = (
  payload: SvmWalletEventMap[K],
) => void;
