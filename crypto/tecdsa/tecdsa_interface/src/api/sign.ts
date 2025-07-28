import type { SignOutput, RcvdSignMessages } from "../sign";

export interface SignStep1Request {
  msg: string;
  msgs_1: RcvdSignMessages;
}

export interface SignStep1V2Request extends SignStep1Request {
  user_id: string;
  session_id: string;
}

export interface SignStep1V3Request {
  user_id: string;
  session_id: string;
  msg: number[];
  msgs_1: RcvdSignMessages;
}

export interface SignStep1Response {
  msgs_0: RcvdSignMessages;
}

export type SignStep2Request = SignOutput;

export interface SignStep2V2Request extends SignStep2Request {
  user_id: string;
  session_id: string;
}

export type SignStep2Response = SignOutput;
