import { Participant } from "./participant";

export interface KeyshareState {
  participants: number[];
  threshold: number;
  transcript_feed: Record<string, Uint8Array>;
  f_coefficients: string[];
  big_f?: { coefficients: string[] };
  randomizer?: Uint8Array;
  phi_proof?: {
    e: string;
    s: string;
  };
  commitment?: Uint8Array;
  confirmation?: Uint8Array;
  x_i?: string | null;
}

export interface RcvdKeyshareMessages {
  public_key: string | null;
  wait_0: Partial<Record<Participant, Uint8Array>>;
  wait_1: Partial<Record<Participant, Uint8Array>>;
  wait_2: Partial<Record<Participant, Uint8Array>>;
  wait_3: Partial<Record<Participant, Uint8Array>>;
}

export interface ClientKeygenStepOutput {
  st_0: KeyshareState;
  msgs_1: RcvdKeyshareMessages;
}

export interface KeygenOutput {
  private_share: string;
  public_key: string;
}

export interface CentralizedKeygenOutput {
  private_key: string;
  keygen_outputs: KeygenOutput[];
}

export interface ServerKeygenStepOutput {
  st_1: KeyshareState;
  msgs_0: RcvdKeyshareMessages;
}

export interface KeygenEntity {
  keygenState: KeyshareState;
  keygenMessages: RcvdKeyshareMessages;
  keygenOutput: KeygenOutput | null;
}

export interface KeyCombineInput {
  shares: Record<number, string>;
}

export interface TECDSAClientKeygenState {
  keygenState: KeyshareState | null;
  keygenMessages: RcvdKeyshareMessages | null;
  keygenOutput: KeygenOutput | null;
}
