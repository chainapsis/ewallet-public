import type { WorkerMessage } from "./types";
import type { RawBalance } from "@oko-wallet-user-dashboard/types";

export interface ScanTargetCosmos {
  chainId: string;
  chainName: string;
  chainImageUrl: string | undefined;
  type: "cosmos";
  bech32Prefix: string;
  restEndpoint: string;
}

export interface ScanTargetEvm {
  chainId: string;
  chainName: string;
  chainImageUrl: string | undefined;
  type: "evm";
  rpc: string;
  evmChainId: number | undefined;
}

export interface ScanTargetSvm {
  chainId: string;
  chainName: string;
  chainImageUrl: string | undefined;
  type: "svm";
  rpc: string;
}

export type ScanTarget = ScanTargetCosmos | ScanTargetEvm | ScanTargetSvm;

export interface TokenScanRequest extends WorkerMessage {
  type: "TOKEN_SCAN";
  cosmosPublicKey: Uint8Array;
  ethAddress: string;
  svmAddress: string;
  chains: ScanTarget[];
}

export interface TokenScanResponse extends WorkerMessage {
  type: "TOKEN_SCAN_RESULT";
  results: TokenScanResult[];
  completedAt: number;
}

export interface TokenScanResult {
  chainId: string;
  chainName: string;
  chainImageUrl: string | undefined;
  chainType: "cosmos" | "evm" | "svm";
  address: string;
  balances: RawBalance[];
}
