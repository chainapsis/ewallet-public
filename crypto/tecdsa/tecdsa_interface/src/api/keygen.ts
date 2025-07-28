import type { KeygenOutput, RcvdKeyshareMessages } from "../keygen";

export interface KeygenStep1Request {
  msgs_1: RcvdKeyshareMessages;
}

export interface KeygenStep1V2Request extends KeygenStep1Request {
  user_id: string;
}

export interface KeygenStep1Response {
  msgs_0: RcvdKeyshareMessages;
}

export interface KeygenStep2Request {
  wait_1_0_1: Uint8Array;
}

export interface KeygenStep2V2Request extends KeygenStep2Request {
  user_id: string;
}

export interface KeygenStep2Response {
  wait_1_1_0: Uint8Array;
}

export interface KeygenStep3Request {
  wait_2_0_1: Uint8Array;
}

export interface KeygenStep3V2Request extends KeygenStep3Request {
  user_id: string;
}

export interface KeygenStep3Response {
  wait_2_1_0: Uint8Array;
}

export interface KeygenStep4Request {
  wait_3_0_1: Uint8Array;
}

export interface KeygenStep4V2Request extends KeygenStep4Request {
  user_id: string;
}

export interface KeygenStep4Response {
  wait_3_1_0: Uint8Array;
}

export interface KeygenStep5Request {
  public_key: string;
}

export interface KeygenStep5V2Request extends KeygenStep5Request {
  user_id: string;
}

export interface KeygenStep5Response {
  public_key: string;
}

export interface KeygenCentralizedRequest {
  user_id: string;
  keygen_1: KeygenOutput;
}
