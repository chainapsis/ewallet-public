import type {
  KeygenOutput,
  KeyshareState,
  RcvdKeyshareMessages,
} from "../keygen";
import type {
  PresignOutput,
  PresignState,
  RcvdPresignMessages,
} from "../presign";
import type { RcvdSignMessages, SignState } from "../sign";
import type {
  RcvdTriplesMessages,
  TriplePub,
  TriplesShare,
  TriplesState,
} from "../triples";

export interface TECDSAClientState {
  // keygen
  keygenState: KeyshareState | null;
  keygenMessages: RcvdKeyshareMessages | null;
  keygenOutput: KeygenOutput | null;

  // triples
  triplesState: TriplesState | null;
  triplesMessages: RcvdTriplesMessages | null;
  triple0Pub: TriplePub | null;
  triple1Pub: TriplePub | null;
  triple0Share0: TriplesShare | null;
  triple1Share1: TriplesShare | null;

  // presign
  presignState: PresignState | null;
  presignMessages: RcvdPresignMessages | null;
  presignOutput: PresignOutput | null;

  // sign
  signState: SignState | null;
  signMessages: RcvdSignMessages | null;
}

export interface TECDSAServerState {
  // keygen
  keygenState: KeyshareState | null;
  keygenMessages: RcvdKeyshareMessages;
  keygenOutput: KeygenOutput | null;

  // triple
  triplesState: TriplesState | null;
  triplesMessages: RcvdTriplesMessages | null;
  triple0Pub: TriplePub | null;
  triple1Pub: TriplePub | null;
  triple0Share: TriplesShare | null;
  triple1Share: TriplesShare | null;

  // presign
  presignState: PresignState | null;
  presignMessages: RcvdPresignMessages;
  presignOutput: PresignOutput | null;

  // sign
  signState: SignState | null;
  signMessages: RcvdSignMessages | null;
}
