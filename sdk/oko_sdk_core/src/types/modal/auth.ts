export interface EmailLoginModalPayload {
  modal_type: "auth/email_login";
  modal_id: string;
  data: {
    email_hint?: string | null;
    oauth?: {
      nonce: string;
      state: string;
    };
  };
}

export interface EmailLoginModalResult {
  email: string;
}

export type EmailLoginModalApproveAckPayload = {
  modal_type: "auth/email_login";
  modal_id: string;
  type: "approve";
  data: EmailLoginModalResult;
};

export type EmailLoginModalRejectAckPayload = {
  modal_type: "auth/email_login";
  modal_id: string;
  type: "reject";
};

export type EmailLoginModalErrorAckPayload = {
  modal_type: "auth/email_login";
  modal_id: string;
  type: "error";
  error: EmailLoginModalError;
};

export type EmailLoginModalError =
  | { type: "invalid_email_format" }
  | { type: "verification_failed"; message?: string }
  | { type: "host_origin_missing" }
  | { type: "not_implemented" }
  | { type: "unknown_error"; error: any };
