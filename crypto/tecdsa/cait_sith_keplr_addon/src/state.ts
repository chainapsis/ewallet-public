import type {
  KeygenEntity,
  KeyshareState,
  PresignEntity,
  PresignOutput,
  PresignState,
  RcvdKeyshareMessages,
  RcvdPresignMessages,
  RcvdSignMessages,
  RcvdTriplesMessages,
  SignEntity,
  SignState,
  TECDSAClientState,
  TECDSAServerState,
  TriplePub,
  TriplesEntity,
  TriplesShare,
  TriplesState,
} from "@oko-wallet/tecdsa-interface";

export type UserId = string;
export type SessionId = string;

export const makeClientState: () => TECDSAClientState = () => ({
  keygenState: {} as KeyshareState,
  keygenMessages: {} as RcvdKeyshareMessages,
  keygenOutput: null,

  triplesState: {} as TriplesState,
  triplesMessages: {} as RcvdTriplesMessages,
  triple0Pub: {} as TriplePub,
  triple1Pub: {} as TriplePub,
  triple0Share0: {} as TriplesShare,
  triple1Share1: {} as TriplesShare,

  presignState: {} as PresignState,
  presignMessages: {} as RcvdPresignMessages,
  presignOutput: {} as PresignOutput,

  signState: {} as SignState,
  signMessages: {} as RcvdSignMessages,
});

export const makeServerState: () => TECDSAServerState = () => {
  return {
    keygenState: {} as KeyshareState,
    keygenMessages: {
      public_key: null,
      wait_0: {},
      wait_1: {},
      wait_2: {},
      wait_3: {},
    },
    keygenOutput: null,

    triplesState: {} as TriplesState,
    triplesMessages: {} as RcvdTriplesMessages,
    triple0Pub: {} as TriplePub,
    triple1Pub: {} as TriplePub,
    triple0Share: {} as TriplesShare,
    triple1Share: {} as TriplesShare,

    presignState: {} as PresignState,
    presignMessages: {} as RcvdPresignMessages,
    presignOutput: {} as PresignOutput,

    signState: {} as SignState,
    signMessages: {} as RcvdSignMessages,
  };
};

export const makeServerState2 = () => {
  const keygens = new Map<UserId, KeygenEntity>();

  const triples = new Map<SessionId, TriplesEntity>();

  const presigns = new Map<SessionId, PresignEntity>();

  const signs = new Map<SessionId, SignEntity>();

  return {
    keygens,
    triples,
    presigns,
    signs,
  };
};
