import type { IdentifierString } from "@wallet-standard/base";

export interface WalletStandardFeatures {
  readonly signIn: IdentifierString;
  readonly signMessage: IdentifierString;
  readonly signTransaction: IdentifierString;
  readonly signAndSendTransaction: IdentifierString;
}

export interface WalletStandardConfig {
  readonly chains: readonly IdentifierString[];
  readonly features: WalletStandardFeatures;
  readonly rpcEndpoints?: Partial<Record<IdentifierString, string>>;
}

export function isSvmChain(chain: string): chain is IdentifierString {
  return chain.startsWith("solana:");
}
