import { Participant } from "./participant";

export interface TriplePub {
  big_a: string;
  big_b: string;
  big_c: string;
  participants: number[];
  threshold: number;
}

export interface TriplesShare {
  a: string;
  b: string;
  c: string;
}

export interface TriplesState {
  transcript_feed: Record<string, string[]>;
  participants: number[];
  threshold: number;
  triples_count: number;

  my_commitments: string[];
  my_randomizers: string[];
  e_v_coefficients: string[][];
  f_v_coefficients: string[][];
  l_v_coefficients: string[];

  all_commitments_vec_2: Record<Participant, string>[];

  big_e_i_v: string[];
  big_f_i_v: string[];
  big_l_i_v: string[];

  my_confirmations: string[];

  my_phi_proof0v: string[];
  my_phi_proof1v: string[];

  big_c_i_points: string[];
  big_c_i_v: string[];
  my_phi_proofs: string[];

  a_i_v: string[];
  b_i_v: string[];

  big_e_v: string[];
  big_f_v: string[];
  big_l_v: string[];
  big_e_j_zero_v_2: Record<Participant, string>[];

  e0_v: string[];
  f0_v: string[];

  big_y_affine_v: string[];
  yv: string[];
  big_z_v: string[];

  dkv: [string, string][];

  t_v: string[];
  q_v: string[];
  b_v: string[];
  seed_v: string[];

  delta_1_v: string[][];
  delta_2_v: string[][];

  receiver_res0_v: [number, string][][];
  receiver_res1_v: [number, string][][];

  sender_res0_v: [string, string][][];
  sender_res1_v: [string, string][][];

  l0_v: string[];

  big_c_v: string[];
  c_i_v: string[];
  hat_big_c_i_v: string[];
}

export interface Wait2Payload {
  big_e_i_v: string[];
  big_f_i_v: string[];
  big_l_i_v: string[];
  my_randomizers: string[];
  my_phi_proof0v: string[];
  my_phi_proof1v: string[];
}

export interface Wait3Payload {
  a_i_j_v: string[];
  b_i_j_v: string[];
}

export interface Wait4Payload {
  big_c_i_points: string[];
  my_phi_proofs: string[];
}

export interface Wait5Payload {
  hat_big_c_i_points: string[];
  my_phi_proofs: string[];
}

export interface Wait6Payload {
  c_i_j_v: string[];
}

export interface MTAWait0Payload {
  c1_v: [string, string][][];
  c2_v: [string, string][][];
}

export interface MTAWait1Payload {
  chi1_seed_1_v: [string, string][];
  chi1_seed_2_v: [string, string][];
}

export interface RcvdTriplesMessages {
  wait_0: Partial<Record<Participant, string[]>>;
  wait_1: Partial<Record<Participant, string[]>>;
  wait_2: Partial<Record<Participant, Wait2Payload>>;
  wait_3: Partial<Record<Participant, Wait3Payload>>;
  wait_4: Partial<Record<Participant, Wait4Payload>>;
  wait_5: Partial<Record<Participant, Wait5Payload>>;
  wait_6: Partial<Record<Participant, Wait6Payload>>;
  batch_random_ot_wait_0: Partial<Record<Participant, string[][]>>;
  correlated_ot_wait_0: Partial<Record<Participant, string[]>>;
  random_ot_extension_wait_0: Partial<Record<Participant, string[]>>;
  random_ot_extension_wait_1: Partial<
    Record<Participant, [string, string[]][]>
  >;
  mta_wait_0: Partial<Record<Participant, MTAWait0Payload>>;
  mta_wait_1: Partial<Record<Participant, MTAWait1Payload>>;
}

export interface ClientTriplesStepOutput {
  st_0: TriplesState;
  msgs_1: RcvdTriplesMessages;
}

export interface SrvTriplesStepOutput {
  st_1: TriplesState;
  msgs_0: RcvdTriplesMessages;
}

export interface TriplesGenResult {
  pub0: TriplePub;
  pub1: TriplePub;
  shares0: TriplesShare[];
  shares1: TriplesShare[];
}

export interface TriplesGenManyResult {
  pub_v: TriplePub[];
  share_v: TriplesShare[];
}

export interface TriplesEntity {
  triplesState: TriplesState | null;
  triplesMessages: RcvdTriplesMessages | null;
  triple0Pub: TriplePub | null;
  triple1Pub: TriplePub | null;
  triple0Share: TriplesShare | null;
  triple1Share: TriplesShare | null;
}

export interface TECDSATriplesState {
  triplesState: TriplesState | null;
  triplesMessages: RcvdTriplesMessages | null;
  triple0Pub: TriplePub | null;
  triple1Pub: TriplePub | null;
  triple0Share: TriplesShare | null;
  triple1Share: TriplesShare | null;
}
