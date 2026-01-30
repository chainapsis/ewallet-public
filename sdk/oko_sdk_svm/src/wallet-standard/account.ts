import type { IdentifierString, WalletAccount } from "@wallet-standard/base";

export class OkoSvmWalletAccount implements WalletAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains: readonly IdentifierString[];
  readonly features: readonly IdentifierString[];

  constructor(
    address: string,
    publicKey: Uint8Array,
    chains: readonly IdentifierString[],
    features: readonly IdentifierString[],
  ) {
    this.address = address;
    this.publicKey = publicKey;
    this.chains = chains;
    this.features = features;
  }
}
