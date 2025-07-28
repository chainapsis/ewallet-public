import type {
  MTAWait0Payload,
  MTAWait1Payload,
  RcvdTriplesMessages,
  TriplePub,
  Wait2Payload,
  Wait3Payload,
  Wait4Payload,
  Wait5Payload,
  Wait6Payload,
} from "../triples";

export interface Triples2Step1Request {
  msgs_1: RcvdTriplesMessages;
}

export interface Triples2Step1V2Request extends Triples2Step1Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step1Response {
  msgs_0: RcvdTriplesMessages;
}

export interface Triples2Step2Request {
  wait_1: string[];
}

export interface Triples2Step2V2Request extends Triples2Step2Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step2Response {
  wait_1: string[];
}

export interface Triples2Step3Request {
  wait_2: Wait2Payload;
}

export interface Triples2Step3V2Request extends Triples2Step3Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step3Response {
  wait_2: Wait2Payload;
}

export interface Triples2Step4Request {
  wait_3: Wait3Payload;
}

export interface Triples2Step4V2Request extends Triples2Step4Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step4Response {
  wait_3: Wait3Payload;
}

export interface Triples2Step5Request {
  wait_4: Wait4Payload;
}

export interface Triples2Step5V2Request extends Triples2Step5Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step5Response {
  wait_4: Wait4Payload;
}

export interface Triples2Step6Request {
  batch_random_ot_wait_0: string[][];
}

export interface Triples2Step6V2Request extends Triples2Step6Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step6Response {
  batch_random_ot_wait_0: string[][];
}

export interface Triples2Step7Request {
  correlated_ot_wait_0: string[];
}

export interface Triples2Step7V2Request extends Triples2Step7Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step7Response {
  random_ot_extension_wait_0: string[];
}

export interface Triples2Step8Request {
  random_ot_extension_wait_1: [string, string[]][];
}

export interface Triples2Step8V2Request extends Triples2Step8Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step8Response {
  mta_wait_0: MTAWait0Payload;
}

export interface Triples2Step9Request {
  mta_wait_1: MTAWait1Payload;
}

export interface Triples2Step9V2Request extends Triples2Step9Request {
  user_id: string;
  session_id: string;
}

// returns only success status
export interface Triples2Step9Response {
  is_success: boolean;
}

export interface Triples2Step10Request {
  wait_5: Wait5Payload;
  wait_6: Wait6Payload;
}

export interface Triples2Step10V2Request extends Triples2Step10Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step10Response {
  wait_5: Wait5Payload;
  wait_6: Wait6Payload;
}

export interface Triples2Step11Request {
  pub_v: TriplePub[];
}

export interface Triples2Step11V2Request extends Triples2Step11Request {
  user_id: string;
  session_id: string;
}

export interface Triples2Step11Response {
  pub_v: TriplePub[];
}
