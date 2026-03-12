export interface OtherModalPayload {
  modal_type: "other";
  modal_id: string;
  // biome-ignore lint/complexity/noBannedTypes: intentional empty object type
  data: {};
}

export type OtherModalApproveAckPayload = {
  modal_type: "other";
  modal_id: string;
  type: "approve";
  data: any;
};

export type OtherModalRejectAckPayload = {
  modal_type: "other";
  modal_id: string;
  type: "reject";
};

export type OtherModalErrorAckPayload = {
  modal_type: "other";
  modal_id: string;
  type: "error";
  error: OtherModalError;
};

export type OtherModalError =
  | {
      type: "unknown_error";
      error: any;
    }
  | {
      type: "data_null";
      original_modal_type: string;
    };
