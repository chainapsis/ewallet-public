import {
  runKeygenServerStep1,
  runKeygenServerStep2,
  runKeygenServerStep3,
  runKeygenServerStep4,
  runKeygenServerStep5,
} from "@oko-wallet/cait-sith-keplr-addon/src/server";
import type {
  KeygenStep1Request,
  KeygenStep1Response,
  KeygenStep2Request,
  KeygenStep2Response,
  KeygenStep3Request,
  KeygenStep3Response,
  KeygenStep4Request,
  KeygenStep4Response,
  KeygenStep5Request,
  KeygenStep5Response,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";
import type { Router } from "express";

import { appServerState } from "../state";

export function setKeygenRoutes(router: Router) {
  router.post<object, KeygenStep1Response, KeygenStep1Request>(
    "/keygen_step_1",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        serverState.keygenMessages = req.body.msgs_1;

        const keygenServerStep1Result = runKeygenServerStep1();
        serverState.keygenState = keygenServerStep1Result.st_1;

        res.json({
          msgs_0: keygenServerStep1Result.msgs_0,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, KeygenStep2Response, KeygenStep2Request>(
    "/keygen_step_2",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        serverState.keygenMessages.wait_1[Participant.P0] = req.body.wait_1_0_1;

        const keygenServerStep2Result = runKeygenServerStep2(
          serverState.keygenState!,
          serverState.keygenMessages!,
        );
        serverState.keygenState = keygenServerStep2Result.st_1;

        res.json({
          wait_1_1_0: keygenServerStep2Result.msgs_0.wait_1[1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, KeygenStep3Response, KeygenStep3Request>(
    "/keygen_step_3",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        serverState.keygenMessages.wait_2![Participant.P0] =
          req.body.wait_2_0_1;

        const keygenServerStep3Result = runKeygenServerStep3(
          serverState.keygenState!,
          serverState.keygenMessages!,
        );
        serverState.keygenState = keygenServerStep3Result.st_1;

        res.json({
          wait_2_1_0: keygenServerStep3Result.msgs_0.wait_2[1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, KeygenStep4Response, KeygenStep4Request>(
    "/keygen_step_4",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        serverState.keygenMessages.wait_3![Participant.P0] =
          req.body.wait_3_0_1;

        const keygenServerStep4Result = runKeygenServerStep4(
          serverState.keygenState!,
          serverState.keygenMessages!,
        );
        serverState.keygenState = keygenServerStep4Result.st_1;

        res.json({
          wait_3_1_0: keygenServerStep4Result.msgs_0.wait_3[1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, KeygenStep5Response, KeygenStep5Request>(
    "/keygen_step_5",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        serverState.keygenMessages.public_key = req.body.public_key;

        const keygen2 = runKeygenServerStep5(
          serverState.keygenState!,
          serverState.keygenMessages!,
        );
        serverState.keygenOutput = keygen2;

        if (req.body.public_key !== keygen2.public_key) {
          console.error("public key is not same!");
        }

        console.log("\nkeygen_2: %j\n", keygen2);

        res.json({
          public_key: keygen2.public_key,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );
}
