import type {
  MakeCosmosSigData,
  MakeCosmosSigError,
  MakeCosmosSigModalResult,
} from "./cosmos";
import type {
  MakeEthereumSigData,
  MakeEthSigError,
  MakeEthSigModalResult,
} from "./eth";
import type {
  MakeSvmSigData,
  MakeSvmSigError,
  MakeSvmSigModalResult,
} from "./svm";

export * from "./common";
export * from "./cosmos";
export * from "./eth";
export * from "./svm";

export type MakeSigModalPayload =
  | {
      modal_type: "cosmos/make_signature";
      modal_id: string;
      data: MakeCosmosSigData;
    }
  | {
      modal_type: "eth/make_signature";
      modal_id: string;
      data: MakeEthereumSigData;
    }
  | {
      modal_type: "svm/make_signature";
      modal_id: string;
      data: MakeSvmSigData;
    };

export type MakeSigModalApproveAckPayload =
  | {
      modal_type: "cosmos/make_signature";
      modal_id: string;
      type: "approve";
      data: MakeCosmosSigModalResult;
    }
  | {
      modal_type: "eth/make_signature";
      modal_id: string;
      type: "approve";
      data: MakeEthSigModalResult;
    }
  | {
      modal_type: "svm/make_signature";
      modal_id: string;
      type: "approve";
      data: MakeSvmSigModalResult;
    };

export type MakeSigModalRejectAckPayload =
  | {
      modal_type: "eth/make_signature";
      modal_id: string;
      type: "reject";
    }
  | {
      modal_type: "cosmos/make_signature";
      modal_id: string;
      type: "reject";
    }
  | {
      modal_type: "svm/make_signature";
      modal_id: string;
      type: "reject";
    };

export type MakeSigModalErrorAckPayload =
  | {
      modal_type: "eth/make_signature";
      modal_id: string;
      type: "error";
      error: MakeEthSigError;
    }
  | {
      modal_type: "cosmos/make_signature";
      modal_id: string;
      type: "error";
      error: MakeCosmosSigError;
    }
  | {
      modal_type: "svm/make_signature";
      modal_id: string;
      type: "error";
      error: MakeSvmSigError;
    };
