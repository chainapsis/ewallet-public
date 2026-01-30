import type { MakeSigError } from "./common";

export interface MakeSvmSigModalResult {
  chain_type: "svm";
  sig_result: MakeSvmSigResult;
}

export type MakeSvmSigData =
  | MakeSvmTxSignData
  | MakeSvmAllTxSignData
  | MakeSvmMessageSignData;

export interface MakeSvmTxSignData {
  chain_type: "svm";
  sign_type: "tx";
  payload: SvmTxSignPayload;
}

export interface MakeSvmAllTxSignData {
  chain_type: "svm";
  sign_type: "all_tx";
  payload: SvmAllTxSignPayload;
}

export interface MakeSvmMessageSignData {
  chain_type: "svm";
  sign_type: "message";
  payload: SvmMessageSignPayload;
}

export type MakeSvmSigResult =
  | { type: "signature"; signature: string }
  | { type: "signatures"; signatures: string[] };

export interface SvmTxSignPayload {
  origin: string;
  signer: string;
  chain_id: string;
  data: {
    serialized_transaction: string;
    message_to_sign: string;
    is_versioned: boolean;
  };
}

export interface SvmAllTxSignPayload {
  origin: string;
  signer: string;
  chain_id: string;
  data: {
    serialized_transactions: string[];
    messages_to_sign: string[];
    is_versioned: boolean;
  };
}

export interface SvmMessageSignPayload {
  origin: string;
  signer: string;
  chain_id: string;
  data: {
    message: string;
  };
}

export type MakeSvmSigError =
  | {
      type: "unknown_error";
      error: any;
    }
  | MakeSigError;
