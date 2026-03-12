import {
  runPresignServerStep1,
  runPresignServerStep2,
  runPresignServerStep3,
  runTriplesServerStep1,
} from "@oko-wallet/cait-sith-keplr-addon/src/server";
import type {
  PresignStep1Request,
  PresignStep1Response,
  PresignStep2Request,
  PresignStep2Response,
  PresignStep3Request,
  PresignStep3Response,
  TriplesStep1Request,
  TriplesStep1Response,
} from "@oko-wallet/tecdsa-interface";
import type { Router } from "express";

import { appServerState } from "../state";

export function setPresignRoutes(router: Router) {
  router.post<object, TriplesStep1Response, TriplesStep1Request>(
    "/triples_step_1",
    (_req, res) => {
      try {
        const { serverState } = appServerState;

        const { pub0, pub1, shares0, shares1 } = runTriplesServerStep1();
        serverState.triple0Pub = pub0;
        serverState.triple1Pub = pub1;
        serverState.triple0Share = shares0[1];
        serverState.triple1Share = shares1[1];

        res.json({
          pub0,
          pub1,
          shares0: shares0[0],
          shares1: shares1[0],
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, PresignStep1Response, PresignStep1Request>(
    "/presign_step_1",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        serverState.presignMessages = req.body.msgs_1;

        const presignServerStep1Result = runPresignServerStep1(
          serverState.triple0Pub!,
          serverState.triple1Pub!,
          serverState.triple0Share!,
          serverState.triple1Share!,
          serverState.keygenOutput!,
        );
        serverState.presignState = presignServerStep1Result.state;

        res.json({
          msgs_0: presignServerStep1Result.msgs0,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, PresignStep2Response, PresignStep2Request>(
    "/presign_step_2",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        serverState.presignMessages.wait_1[0] = req.body.wait_1_0_1;

        const presignServerStep2Result = runPresignServerStep2(
          serverState.presignState!,
        );
        serverState.presignState = presignServerStep2Result.state;

        res.json({
          wait_1_1_0: presignServerStep2Result.msgs0.wait_1[1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, PresignStep3Response, PresignStep3Request>(
    "/presign_step_3",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        const presignServerStep3Result = runPresignServerStep3(
          serverState.presignState!,
          serverState.presignMessages,
        );
        serverState.presignOutput = presignServerStep3Result;

        if (req.body.presign_output.big_r !== serverState.presignOutput.big_r) {
          throw new Error("presign failed. big_r do not match");
        }

        console.log("\npresign output: %j\n", presignServerStep3Result);

        res.json({
          presign_output: presignServerStep3Result,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );
}
