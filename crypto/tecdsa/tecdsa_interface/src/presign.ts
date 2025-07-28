import type { KeygenOutput } from "./keygen";
import type { TriplePub, TriplesShare } from "./triples";
import { Participant } from "./participant";

export interface PresignState {
  threshold: number;
  participants: number[];
  pub_0: TriplePub;
  pub_1: TriplePub;
  share_0_0: TriplesShare;
  share_1_0: TriplesShare;
  keygen_out: KeygenOutput;

  big_kd: string | null;
  big_k: string | null;
  big_a: string | null;
  big_x: string | null;
  big_b: string | null;
  big_d: string | null;

  sk_lambda: string | null;
  bt_lambda: string | null;
  a_i: string | null;
  c_i: string | null;
  k_i: string | null;

  k_prime_i: string | null;
  a_prime_i: string | null;
  b_prime_i: string | null;
  x_prime_i: string | null;

  kd_i: string | null;
  ka_i: string | null;
  xb_i: string | null;

  kd_sum: string | null;
  ka_sum: string | null;
  xb_sum: string | null;

  big_r: string | null;
  k_final: string | null;
  sigma_i_final: string | null;
}

export interface RcvdPresignMessages {
  wait_0: Partial<Record<Participant, string>>;
  wait_1: Partial<Record<Participant, [string, string]>>;
}

export interface ClientPresignStepOutput {
  st_0: PresignState;
  msgs_1: RcvdPresignMessages;
}

export interface PresignOutput {
  big_r: string;
  k: string;
  sigma: string;
}

export interface PresignEntity {
  presignState: PresignState | null;
  presignMessages: RcvdPresignMessages;
  presignOutput: PresignOutput | null;
}

export interface TECDSAPresignState {
  presignState: PresignState | null;
  presignMessages: RcvdPresignMessages | null;
  presignOutput: PresignOutput | null;
}
