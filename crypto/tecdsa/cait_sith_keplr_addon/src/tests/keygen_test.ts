import type {
  TECDSAClientState,
  TECDSAServerState,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";

import {
  runKeygenClientStep1,
  runKeygenClientStep2,
  runKeygenClientStep3,
  runKeygenClientStep4,
  runKeygenClientStep5,
} from "../client";
import {
  runKeygenServerStep1,
  runKeygenServerStep2,
  runKeygenServerStep3,
  runKeygenServerStep4,
  runKeygenServerStep5,
} from "../server";

export function keygenTest(
  clientState: TECDSAClientState,
  serverState: TECDSAServerState,
) {
  // client execute step1
  const keygenClientStep1Result = runKeygenClientStep1();
  clientState.keygenState = keygenClientStep1Result.st_0;

  // client -> server call step1
  // server msg receive
  const keygenServerStep1Result = runKeygenServerStep1();
  serverState.keygenState = keygenServerStep1Result.st_1;
  serverState.keygenMessages = keygenClientStep1Result.msgs_1;

  // server -> client res step1
  clientState.keygenMessages = keygenServerStep1Result.msgs_0;

  // client execute step2
  const keygenClientStep2Result = runKeygenClientStep2(
    clientState.keygenState,
    clientState.keygenMessages,
  );
  clientState.keygenState = keygenClientStep2Result.st_0;

  // client -> server call step2
  // server msg receive
  serverState.keygenMessages.wait_1![Participant.P0] =
    keygenClientStep2Result.msgs_1.wait_1![Participant.P0];

  const keygenServerStep2Result = runKeygenServerStep2(
    serverState.keygenState,
    serverState.keygenMessages,
  );
  serverState.keygenState = keygenServerStep2Result.st_1;

  // server -> client res step2
  clientState.keygenMessages.wait_1![Participant.P1] =
    keygenServerStep2Result.msgs_0.wait_1[Participant.P1];

  // client execute step3
  const keygenClientStep3Result = runKeygenClientStep3(
    clientState.keygenState,
    clientState.keygenMessages,
  );
  clientState.keygenState = keygenClientStep3Result.st_0;

  // client -> server call step3
  // server msg receive
  serverState.keygenMessages.wait_2![Participant.P0] =
    keygenClientStep3Result.msgs_1.wait_2![Participant.P0];

  const keygenServerStep3Result = runKeygenServerStep3(
    serverState.keygenState,
    serverState.keygenMessages,
  );
  serverState.keygenState = keygenServerStep3Result.st_1;

  // server -> client res step3
  clientState.keygenMessages.wait_2![Participant.P1] =
    keygenServerStep3Result.msgs_0.wait_2![Participant.P1];

  // client execute step4
  const keygenClientStep4Result = runKeygenClientStep4(
    clientState.keygenState,
    clientState.keygenMessages,
  );
  clientState.keygenState = keygenClientStep4Result.st_0;

  // client -> server call step4
  // server msg receive
  serverState.keygenMessages.wait_3![Participant.P0] =
    keygenClientStep4Result.msgs_1.wait_3![Participant.P0];

  const keygenServerStep4Result = runKeygenServerStep4(
    serverState.keygenState,
    serverState.keygenMessages,
  );
  serverState.keygenState = keygenServerStep4Result.st_1;

  // server -> client res step4
  clientState.keygenMessages.wait_3![Participant.P1] =
    keygenServerStep4Result.msgs_0.wait_3![Participant.P1];

  // client execute step5
  const keygenClientStep5Result = runKeygenClientStep5(
    clientState.keygenState,
    clientState.keygenMessages,
  );
  clientState.keygenOutput = keygenClientStep5Result;

  // client -> server call step5
  // server msg receive
  serverState.keygenMessages.public_key = keygenClientStep5Result.public_key;
  const keygenServerStep5Result = runKeygenServerStep5(
    serverState.keygenState,
    serverState.keygenMessages,
  );
  serverState.keygenOutput = keygenServerStep5Result;

  if (
    keygenClientStep5Result.public_key === keygenServerStep5Result.public_key
  ) {
    console.log(
      `keygen success. public key: ${keygenClientStep5Result.public_key}`,
    );
  } else {
    throw new Error("keygen failed. public keys do not match");
  }
}
