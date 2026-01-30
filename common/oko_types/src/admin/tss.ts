import { type TssSessionWithCustomerAndUser } from "@oko-wallet-types/tss";
import { type TssActivationSetting } from "@oko-wallet-types/tss_activate";

export interface GetTssSessionListRequest {
  limit: number;
  offset: number;
  node_id?: string;
  customer_id?: string;
  curve_type?: string;
}

export interface GetTssSessionListResponse {
  tss_sessions: TssSessionWithCustomerAndUser[];
  pagination: {
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface GetTssAllActivationSettingResponse {
  tss_activation_setting: TssActivationSetting;
}

export interface SetTssAllActivationSettingRequest {
  is_enabled: boolean;
}

export interface SetTssAllActivationSettingResponse {
  tss_activation_setting: TssActivationSetting;
}
