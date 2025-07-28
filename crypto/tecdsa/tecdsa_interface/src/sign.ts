import { Participant } from "./participant";

export interface SignState {
  threshold: number;
  participants: number[];
  s_i?: string;
}

export interface RcvdSignMessages {
  wait_0: Record<Participant, string>;
}

export interface FullSignature {
  big_r: string;
  s: string;
}

export interface SignOutput {
  sig: FullSignature;
  is_high: boolean;
}

export interface Signature {
  r: string;
  s: string;
}

export interface ClientSignStep1Output {
  st_0: SignState;
  msgs_1: RcvdSignMessages;
}

export interface ServerSignStepOutput {
  st_1: SignState;
  msgs_0: RcvdSignMessages;
}

export interface SignEntity {
  signState: SignState | null;
  signMessages: RcvdSignMessages | null;
}

export interface TECDSASignState {
  signState: SignState | null;
  signMessages: RcvdSignMessages | null;
}
