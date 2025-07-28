import type { PresignOutput, RcvdPresignMessages } from "../presign";
import type { TriplePub, TriplesShare } from "../triples";

export interface TriplesStep1Request { }

export interface TriplesStep1V2Request extends TriplesStep1Request {
  user_id: string;
  session_id: string;
}

export interface TriplesStep1Response {
  pub0: TriplePub;
  pub1: TriplePub;
  shares0: TriplesShare;
  shares1: TriplesShare;
}

export interface PresignStep1Request {
  msgs_1: RcvdPresignMessages;
}

export interface PresignStep1V2Request extends PresignStep1Request {
  user_id: string;
  session_id: string;
}

export interface PresignStep1Response {
  msgs_0: RcvdPresignMessages;
}

export interface PresignStep2Request {
  wait_1_0_1: [string, string];
}

export interface PresignStep2V2Request extends PresignStep2Request {
  user_id: string;
  session_id: string;
}

export interface PresignStep2Response {
  wait_1_1_0: [string, string];
}

export interface PresignStep3Request {
  presign_output: PresignOutput;
}

export interface PresignStep3V2Request extends PresignStep3Request {
  user_id: string;
  session_id: string;
}

export interface PresignStep3Response {
  presign_output: PresignOutput;
}
