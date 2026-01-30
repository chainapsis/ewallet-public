export enum TssSessionState {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  ABORTED = "ABORTED",
}

export interface TssSession {
  session_id: string;
  customer_id: string;
  wallet_id: string;
  state: TssSessionState;
  created_at: Date;
  updated_at: Date;
}

export type TssSessionWithCustomer = TssSession & {
  customer_label: string;
  customer_url?: string;
};

export type TssSessionWithCustomerAndUser = TssSessionWithCustomer & {
  wallet_public_key?: string;
  user_email?: string;
  curve_type?: string;
};

export type CreateTssSessionRequest = {
  customer_id: string;
  wallet_id: string;
};

export type AbortTssSessionRequest = {
  email: string;
  wallet_id: string;
  session_id: string;
};

export type AbortTssSessionBody = {
  session_id: string;
};

export type AbortTssSessionResponse = {
  session_id: string;
};
