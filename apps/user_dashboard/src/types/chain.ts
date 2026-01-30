/**
 * Chain and Currency type definitions
 * Replaces @keplr-wallet/types
 */

export interface Currency {
  readonly coinDenom: string;
  readonly coinMinimalDenom: string;
  readonly coinDecimals: number;
  readonly coinGeckoId?: string;
  readonly coinImageUrl?: string;
}

export interface FeeCurrency extends Currency {
  readonly gasPriceStep?: {
    readonly low: number;
    readonly average: number;
    readonly high: number;
  };
}

export interface BIP44 {
  readonly coinType: number;
}

export interface Bech32Config {
  readonly bech32PrefixAccAddr: string;
  readonly bech32PrefixAccPub: string;
  readonly bech32PrefixValAddr: string;
  readonly bech32PrefixValPub: string;
  readonly bech32PrefixConsAddr: string;
  readonly bech32PrefixConsPub: string;
}

// Base Cosmos chain info (from Keplr API)
export interface CosmosChainInfo {
  readonly chainId: string;
  readonly chainName: string;
  readonly rpc: string;
  readonly rest: string;
  readonly bip44: BIP44;
  readonly bech32Config?: Bech32Config;
  readonly currencies: Currency[];
  readonly feeCurrencies: FeeCurrency[];
  readonly stakeCurrency?: Currency;
  readonly features?: string[];
  readonly chainSymbolImageUrl?: string;
  readonly beta?: boolean;
  readonly hideInUI?: boolean;
  readonly isTestnet?: boolean;
  readonly evm?: {
    readonly chainId: number;
    readonly rpc: string;
  };
}

// EVM-only chain info
export interface EVMChainInfo {
  readonly rpc: string;
  readonly chainId: number;
  readonly websocket?: string;
  readonly currencies: Currency[];
  readonly feeCurrencies: FeeCurrency[];
  readonly bip44: BIP44;
  readonly features?: string[];
}

// Solana chain info
export interface SolanaChainInfo {
  readonly rpc: string;
  readonly currencies: Currency[];
}

export type ChainModule = "cosmos" | "evm" | "starknet" | "bitcoin" | "solana";

// Unified chain info structure
export interface ModularChainInfo {
  readonly chainId: string;
  readonly chainName: string;
  readonly chainSymbolImageUrl?: string;
  readonly isTestnet?: boolean;
  readonly isNative?: boolean;
  readonly cosmos?: CosmosChainInfo;
  readonly evm?: EVMChainInfo;
  readonly solana?: SolanaChainInfo;
}

// Chain info with UI state
export interface ChainInfoWithState extends ModularChainInfo {
  readonly isEnabled: boolean;
}
