import type {
  TECDSAClientState,
  TECDSAServerState,
  TriplePub,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";

import {
  runTriplesClientStep1,
  runTriplesClientStep2,
  runTriplesClientStep3,
  runTriplesClientStep4,
  runTriplesClientStep5,
  runTriplesClientStep6,
  runTriplesClientStep7,
  runTriplesClientStep8,
  runTriplesClientStep9,
  runTriplesClientStep10,
  runTriplesClientStep11,
} from "../client";
import {
  runTriples2ServerStep1,
  runTriples2ServerStep2,
  runTriples2ServerStep3,
  runTriples2ServerStep4,
  runTriples2ServerStep5,
  runTriples2ServerStep6,
  runTriples2ServerStep7,
  runTriples2ServerStep8,
  runTriples2ServerStep9,
  runTriples2ServerStep10,
  runTriples2ServerStep11,
} from "../server/triples";

export function triplesTest(
  clientState: TECDSAClientState,
  serverState: TECDSAServerState,
) {
  // step 1
  const tripleClientStep1Result = runTriplesClientStep1();
  clientState.triplesState = tripleClientStep1Result.st_0;
  serverState.triplesMessages = tripleClientStep1Result.msgs_1;

  const tripleServerStep1Result = runTriples2ServerStep1();
  serverState.triplesState = tripleServerStep1Result.st_1;
  clientState.triplesMessages = tripleServerStep1Result.msgs_0;

  // step 2
  const tripleClientStep2Result = runTriplesClientStep2(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  clientState.triplesState = tripleClientStep2Result.st_0;
  serverState.triplesMessages.wait_1[Participant.P0] =
    tripleClientStep2Result.msgs_1.wait_1[Participant.P0]!;

  const tripleServerStep2Result = runTriples2ServerStep2(
    serverState.triplesState,
    serverState.triplesMessages,
  );
  serverState.triplesState = tripleServerStep2Result.st_1;
  clientState.triplesMessages.wait_1[Participant.P1] =
    tripleServerStep2Result.msgs_0.wait_1[Participant.P1];

  // step 3
  const tripleClientStep3Result = runTriplesClientStep3(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  clientState.triplesState = tripleClientStep3Result.st_0;
  serverState.triplesMessages.wait_2[Participant.P0] =
    tripleClientStep3Result.msgs_1.wait_2[Participant.P0]!;

  const tripleServerStep3Result = runTriples2ServerStep3(
    serverState.triplesState,
    serverState.triplesMessages,
  );
  serverState.triplesState = tripleServerStep3Result.st_1;
  clientState.triplesMessages.wait_2[Participant.P1] =
    tripleServerStep3Result.msgs_0.wait_2[Participant.P1]!;

  // step 4
  const tripleClientStep4Result = runTriplesClientStep4(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  clientState.triplesState = tripleClientStep4Result.st_0;
  serverState.triplesMessages.wait_3[Participant.P0] =
    tripleClientStep4Result.msgs_1.wait_3[Participant.P0]!;

  const tripleServerStep4Result = runTriples2ServerStep4(
    serverState.triplesState,
    serverState.triplesMessages,
  );
  serverState.triplesState = tripleServerStep4Result.st_1;
  clientState.triplesMessages.wait_3[Participant.P1] =
    tripleServerStep4Result.msgs_0.wait_3[Participant.P1]!;

  // step 5
  const tripleClientStep5Result = runTriplesClientStep5(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  clientState.triplesState = tripleClientStep5Result.st_0;
  serverState.triplesMessages.wait_4[Participant.P0] =
    tripleClientStep5Result.msgs_1.wait_4[Participant.P0]!;

  const tripleServerStep5Result = runTriples2ServerStep5(
    serverState.triplesState,
    serverState.triplesMessages,
  );
  serverState.triplesState = tripleServerStep5Result.st_1;
  clientState.triplesMessages.wait_4[Participant.P1] =
    tripleServerStep5Result.msgs_0.wait_4[Participant.P1]!;

  // step 6
  const tripleClientStep6Result = runTriplesClientStep6(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  clientState.triplesState = tripleClientStep6Result.st_0;
  serverState.triplesMessages.batch_random_ot_wait_0[Participant.P0] =
    tripleClientStep6Result.msgs_1.batch_random_ot_wait_0[Participant.P0]!;

  const tripleServerStep6Result = runTriples2ServerStep6(
    serverState.triplesState,
    serverState.triplesMessages,
  );
  serverState.triplesState = tripleServerStep6Result.st_1;
  clientState.triplesMessages.batch_random_ot_wait_0[Participant.P1] =
    tripleServerStep6Result.msgs_0.batch_random_ot_wait_0[Participant.P1]!;

  // step 7
  const tripleClientStep7Result = runTriplesClientStep7(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  clientState.triplesState = tripleClientStep7Result.st_0;
  serverState.triplesMessages.correlated_ot_wait_0[Participant.P0] =
    tripleClientStep7Result.msgs_1.correlated_ot_wait_0[Participant.P0]!;

  const tripleServerStep7Result = runTriples2ServerStep7(
    serverState.triplesState,
    serverState.triplesMessages,
  );
  serverState.triplesState = tripleServerStep7Result.st_1;
  clientState.triplesMessages.random_ot_extension_wait_0[Participant.P1] =
    tripleServerStep7Result.msgs_0.random_ot_extension_wait_0[Participant.P1]!;

  // step 8
  const tripleClientStep8Result = runTriplesClientStep8(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  clientState.triplesState = tripleClientStep8Result.st_0;
  serverState.triplesMessages.random_ot_extension_wait_1[Participant.P0] =
    tripleClientStep8Result.msgs_1.random_ot_extension_wait_1[Participant.P0];

  const tripleServerStep8Result = runTriples2ServerStep8(
    serverState.triplesState,
    serverState.triplesMessages,
  );
  serverState.triplesState = tripleServerStep8Result.st_1;
  clientState.triplesMessages.mta_wait_0[Participant.P1] =
    tripleServerStep8Result.msgs_0.mta_wait_0[Participant.P1]!;

  // step 9
  const tripleClientStep9Result = runTriplesClientStep9(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  clientState.triplesState = tripleClientStep9Result.st_0;
  serverState.triplesMessages.mta_wait_1[Participant.P0] =
    tripleClientStep9Result.msgs_1.mta_wait_1[Participant.P0];

  const tripleServerStep9Result = runTriples2ServerStep9(
    serverState.triplesState,
    serverState.triplesMessages,
  );
  serverState.triplesState = tripleServerStep9Result.st_1;

  // step 10
  const tripleClientStep10Result = runTriplesClientStep10(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  clientState.triplesState = tripleClientStep10Result.st_0;
  serverState.triplesMessages.wait_5[Participant.P0] =
    tripleClientStep10Result.msgs_1.wait_5[Participant.P0];
  serverState.triplesMessages.wait_6[Participant.P0] =
    tripleClientStep10Result.msgs_1.wait_6[Participant.P0];

  const tripleServerStep10Result = runTriples2ServerStep10(
    serverState.triplesState!,
    serverState.triplesMessages,
  );
  serverState.triplesState = tripleServerStep10Result.st_1;
  clientState.triplesMessages.wait_5[Participant.P1] =
    tripleServerStep10Result.msgs_0.wait_5[Participant.P1]!;
  clientState.triplesMessages.wait_6[Participant.P1] =
    tripleServerStep10Result.msgs_0.wait_6[Participant.P1]!;

  // step 11
  const tripleClientStep11Result = runTriplesClientStep11(
    clientState.triplesState,
    clientState.triplesMessages,
  );
  const tripleServerStep11Result = runTriples2ServerStep11(
    serverState.triplesState,
    serverState.triplesMessages,
  );

  clientState.triple0Pub = tripleClientStep11Result.pub_v[0];
  clientState.triple1Pub = tripleClientStep11Result.pub_v[1];
  clientState.triple0Share0 = tripleClientStep11Result.share_v[0];
  clientState.triple1Share1 = tripleClientStep11Result.share_v[1];

  serverState.triple0Pub = tripleServerStep11Result.pub_v[0];
  serverState.triple1Pub = tripleServerStep11Result.pub_v[1];
  serverState.triple0Share = tripleServerStep11Result.share_v[0];
  serverState.triple1Share = tripleServerStep11Result.share_v[1];

  if (
    isPubVEqual(tripleClientStep11Result.pub_v, tripleServerStep11Result.pub_v)
  ) {
    console.log(`triples success`);
  } else {
    throw new Error("triples failed. pub_v do not match");
  }
}

function isPubVEqual(a: TriplePub[], b: TriplePub[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    const pubA = a[i];
    const pubB = b[i];

    if (
      pubA.big_a !== pubB.big_a ||
      pubA.big_b !== pubB.big_b ||
      pubA.big_c !== pubB.big_c ||
      pubA.threshold !== pubB.threshold ||
      pubA.participants.length !== pubB.participants.length ||
      !pubA.participants.every((p, idx) => p === pubB.participants[idx])
    ) {
      return false;
    }
  }

  return true;
}
