import { runTriplesServerStep1 } from "@oko-wallet/cait-sith-keplr-addon/src/server";
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
} from "@oko-wallet/cait-sith-keplr-addon/src/server/triples";
import type {
  TriplePub,
  Triples2Step1Response,
  Triples2Step1V2Request,
  Triples2Step2Response,
  Triples2Step2V2Request,
  Triples2Step3Response,
  Triples2Step3V2Request,
  Triples2Step4Response,
  Triples2Step4V2Request,
  Triples2Step5Response,
  Triples2Step5V2Request,
  Triples2Step6Response,
  Triples2Step6V2Request,
  Triples2Step7Response,
  Triples2Step7V2Request,
  Triples2Step8Response,
  Triples2Step8V2Request,
  Triples2Step9Response,
  Triples2Step9V2Request,
  Triples2Step10Response,
  Triples2Step10V2Request,
  Triples2Step11Response,
  Triples2Step11V2Request,
  TriplesStep1Response,
  TriplesStep1V2Request,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";
import type { Router } from "express";

import { appServerState } from "../state";

export function setTriplesRoutes2(router: Router) {
  // step1 deal version
  router.post<object, TriplesStep1Response, TriplesStep1V2Request>(
    "/triples_step_1",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id } = req.body;

        const { pub0, pub1, shares0, shares1 } = runTriplesServerStep1();

        serverState2.triples.set(session_id, {
          triplesState: null,
          triplesMessages: null,
          triple0Pub: pub0,
          triple1Pub: pub1,
          triple0Share: shares0[Participant.P1],
          triple1Share: shares1[Participant.P1],
        });

        res.json({
          pub0,
          pub1,
          shares0: shares0[Participant.P0],
          shares1: shares1[Participant.P0],
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step1
  router.post<object, Triples2Step1Response, Triples2Step1V2Request>(
    "/triples_2_step_1",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, msgs_1 } = req.body;

        const triplesServerStep1Result = runTriples2ServerStep1();

        serverState2.triples.set(session_id, {
          triplesState: triplesServerStep1Result.st_1,
          triplesMessages: msgs_1,
          triple0Pub: null,
          triple0Share: null,
          triple1Pub: null,
          triple1Share: null,
        });

        res.json({
          msgs_0: triplesServerStep1Result.msgs_0,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step2
  router.post<object, Triples2Step2Response, Triples2Step2V2Request>(
    "/triples_2_step_2",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, wait_1 } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }
        triplesEntity.triplesMessages!.wait_1[Participant.P0] = wait_1;

        const triplesServerStep2Result = runTriples2ServerStep2(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        triplesEntity.triplesState = triplesServerStep2Result.st_1;

        serverState2.triples.set(session_id, triplesEntity);

        res.json({
          wait_1: triplesServerStep2Result.msgs_0.wait_1[Participant.P1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step3
  router.post<object, Triples2Step3Response, Triples2Step3V2Request>(
    "/triples_2_step_3",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, wait_2 } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }
        triplesEntity.triplesMessages!.wait_2[Participant.P0] = wait_2;

        const triplesServerStep3Result = runTriples2ServerStep3(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        triplesEntity.triplesState = triplesServerStep3Result.st_1;

        serverState2.triples.set(session_id, triplesEntity);

        res.json({
          wait_2: triplesServerStep3Result.msgs_0.wait_2[Participant.P1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step4
  router.post<object, Triples2Step4Response, Triples2Step4V2Request>(
    "/triples_2_step_4",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, wait_3 } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }
        triplesEntity.triplesMessages!.wait_3[Participant.P0] = wait_3;

        const triplesServerStep4Result = runTriples2ServerStep4(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        triplesEntity.triplesState = triplesServerStep4Result.st_1;

        serverState2.triples.set(session_id, triplesEntity);

        res.json({
          wait_3: triplesServerStep4Result.msgs_0.wait_3[Participant.P1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step5
  router.post<object, Triples2Step5Response, Triples2Step5V2Request>(
    "/triples_2_step_5",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, wait_4 } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }
        triplesEntity.triplesMessages!.wait_4[Participant.P0] = wait_4;

        const triplesServerStep5Result = runTriples2ServerStep5(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        triplesEntity.triplesState = triplesServerStep5Result.st_1;

        serverState2.triples.set(session_id, triplesEntity);

        res.json({
          wait_4: triplesServerStep5Result.msgs_0.wait_4[Participant.P1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step6
  router.post<object, Triples2Step6Response, Triples2Step6V2Request>(
    "/triples_2_step_6",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, batch_random_ot_wait_0 } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }
        triplesEntity.triplesMessages!.batch_random_ot_wait_0[Participant.P0] =
          batch_random_ot_wait_0;

        const triplesServerStep6Result = runTriples2ServerStep6(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        triplesEntity.triplesState = triplesServerStep6Result.st_1;

        serverState2.triples.set(session_id, triplesEntity);

        res.json({
          batch_random_ot_wait_0:
            triplesServerStep6Result.msgs_0.batch_random_ot_wait_0[
              Participant.P1
            ]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step7
  router.post<object, Triples2Step7Response, Triples2Step7V2Request>(
    "/triples_2_step_7",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, correlated_ot_wait_0 } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }
        triplesEntity.triplesMessages!.correlated_ot_wait_0[Participant.P0] =
          correlated_ot_wait_0;

        const triplesServerStep7Result = runTriples2ServerStep7(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        triplesEntity.triplesState = triplesServerStep7Result.st_1;

        serverState2.triples.set(session_id, triplesEntity);

        res.json({
          random_ot_extension_wait_0:
            triplesServerStep7Result.msgs_0.random_ot_extension_wait_0[
              Participant.P1
            ]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step8
  router.post<object, Triples2Step8Response, Triples2Step8V2Request>(
    "/triples_2_step_8",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, random_ot_extension_wait_1 } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }
        triplesEntity.triplesMessages!.random_ot_extension_wait_1[
          Participant.P0
        ] = random_ot_extension_wait_1;

        const triplesServerStep8Result = runTriples2ServerStep8(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        triplesEntity.triplesState = triplesServerStep8Result.st_1;

        serverState2.triples.set(session_id, triplesEntity);

        res.json({
          mta_wait_0:
            triplesServerStep8Result.msgs_0.mta_wait_0[Participant.P1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step9
  router.post<object, Triples2Step9Response, Triples2Step9V2Request>(
    "/triples_2_step_9",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, mta_wait_1 } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }
        triplesEntity.triplesMessages!.mta_wait_1[Participant.P0] = mta_wait_1;

        const triplesServerStep9Result = runTriples2ServerStep9(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        triplesEntity.triplesState = triplesServerStep9Result.st_1;

        serverState2.triples.set(session_id, triplesEntity);

        res.json({
          is_success: true,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step10
  router.post<object, Triples2Step10Response, Triples2Step10V2Request>(
    "/triples_2_step_10",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, wait_5, wait_6 } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }
        triplesEntity.triplesMessages!.wait_5[Participant.P0] = wait_5;
        triplesEntity.triplesMessages!.wait_6[Participant.P0] = wait_6;

        const triplesServerStep10Result = runTriples2ServerStep10(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        triplesEntity.triplesState = triplesServerStep10Result.st_1;

        serverState2.triples.set(session_id, triplesEntity);

        res.json({
          wait_5: triplesServerStep10Result.msgs_0.wait_5[Participant.P1]!,
          wait_6: triplesServerStep10Result.msgs_0.wait_6[Participant.P1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  // step11
  router.post<object, Triples2Step11Response, Triples2Step11V2Request>(
    "/triples_2_step_11",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id, pub_v } = req.body;

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }

        const triplesServerStep11Result = runTriples2ServerStep11(
          triplesEntity.triplesState!,
          triplesEntity.triplesMessages!,
        );
        if (!isPubVEqual(pub_v, triplesServerStep11Result.pub_v)) {
          throw new Error("triples failed. pub_v do not match");
        }

        triplesEntity.triple0Pub = triplesServerStep11Result.pub_v[0];
        triplesEntity.triple1Pub = triplesServerStep11Result.pub_v[1];
        triplesEntity.triple0Share = triplesServerStep11Result.share_v[0];
        triplesEntity.triple1Share = triplesServerStep11Result.share_v[1];

        serverState2.triples.set(session_id, triplesEntity);

        console.log("\n triples gen output: %j\n", triplesServerStep11Result);

        res.json({
          pub_v: triplesServerStep11Result.pub_v,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );
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
