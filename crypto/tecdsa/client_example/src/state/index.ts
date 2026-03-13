import type {
  KeyshareState,
  PresignOutput,
  PresignState,
  RcvdKeyshareMessages,
  RcvdPresignMessages,
  RcvdSignMessages,
  RcvdTriplesMessages,
  SignState,
  TECDSAClientState,
  TriplePub,
  TriplesShare,
  TriplesState,
} from "@keplr/tecdsa_interface";

export function makeClientState() {
  const st: TECDSAClientState = {
    privateKey: null,
    keygenState0: {} as KeyshareState,
    keygenState1: {} as KeyshareState,
    keygenMessages0: {} as RcvdKeyshareMessages,
    keygenMessages1: {} as RcvdKeyshareMessages,
    keygenOutput0: null,
    keygenOutput1: null,

    triplesState0: {} as TriplesState,
    triplesMessages0: {} as RcvdTriplesMessages,
    triple0Pub: {} as TriplePub,
    triple1Pub: {} as TriplePub,
    triple0Share0: {} as TriplesShare,
    triple1Share1: {} as TriplesShare,

    presignState0: {} as PresignState,
    presignMessages0: {} as RcvdPresignMessages,
    presignOutput0: {} as PresignOutput,

    signState0: {} as SignState,
    signMessages0: {} as RcvdSignMessages,
  };

  return st;
}
