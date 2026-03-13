import {
  runKeygenServerStep1,
  runKeygenServerStep2,
  runKeygenServerStep3,
  runKeygenServerStep4,
  runKeygenServerStep5,
} from "@oko-wallet/cait-sith-keplr-addon/src/server";
import type {
  KeygenCentralizedRequest,
  KeygenStep1Response,
  KeygenStep1V2Request,
  KeygenStep2Response,
  KeygenStep2V2Request,
  KeygenStep3Response,
  KeygenStep3V2Request,
  KeygenStep4Response,
  KeygenStep4V2Request,
  KeygenStep5Response,
  KeygenStep5V2Request,
  KeyshareState,
  RcvdKeyshareMessages,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";
import type { Router } from "express";

import { appServerState } from "../state";

export function setKeygenRoutes2(router: Router) {
  router.post<object, KeygenStep1Response, KeygenStep1V2Request>(
    "/keygen_step_1",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { user_id } = req.body;

        const keygenServerStep1Result = runKeygenServerStep1();

        serverState2.keygens.set(user_id, {
          keygenState: keygenServerStep1Result.st_1,
          keygenMessages: req.body.msgs_1,
          keygenOutput: null,
        });

        res.json({
          msgs_0: keygenServerStep1Result.msgs_0,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, KeygenStep2Response, KeygenStep2V2Request>(
    "/keygen_step_2",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { user_id } = req.body;

        const keygenEntity = serverState2.keygens.get(user_id);
        if (!keygenEntity) {
          throw new Error("not found keygen entity");
        }

        keygenEntity.keygenMessages.wait_1[Participant.P0] =
          req.body.wait_1_0_1;

        const keygenServerStep2Result = runKeygenServerStep2(
          keygenEntity.keygenState,
          keygenEntity.keygenMessages,
        );
        keygenEntity.keygenState = keygenServerStep2Result.st_1;

        serverState2.keygens.set(user_id, keygenEntity);

        res.json({
          wait_1_1_0: keygenServerStep2Result.msgs_0.wait_1[1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, KeygenStep3Response, KeygenStep3V2Request>(
    "/keygen_step_3",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { user_id } = req.body;

        const keygenEntity = serverState2.keygens.get(user_id);
        if (!keygenEntity) {
          throw new Error("not found keygen entity");
        }

        keygenEntity.keygenMessages.wait_2[Participant.P0] =
          req.body.wait_2_0_1;

        const keygenServerStep3Result = runKeygenServerStep3(
          keygenEntity.keygenState,
          keygenEntity.keygenMessages,
        );
        keygenEntity.keygenState = keygenServerStep3Result.st_1;

        serverState2.keygens.set(user_id, keygenEntity);

        res.json({
          wait_2_1_0: keygenServerStep3Result.msgs_0.wait_2[1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, KeygenStep4Response, KeygenStep4V2Request>(
    "/keygen_step_4",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { user_id } = req.body;

        const keygenEntity = serverState2.keygens.get(user_id);
        if (!keygenEntity) {
          throw new Error("not found keygen entity");
        }

        keygenEntity.keygenMessages.wait_3[Participant.P0] =
          req.body.wait_3_0_1;

        const keygenServerStep4Result = runKeygenServerStep4(
          keygenEntity.keygenState,
          keygenEntity.keygenMessages,
        );
        keygenEntity.keygenState = keygenServerStep4Result.st_1;

        serverState2.keygens.set(user_id, keygenEntity);

        res.json({
          wait_3_1_0: keygenServerStep4Result.msgs_0.wait_3[1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, KeygenStep5Response, KeygenStep5V2Request>(
    "/keygen_step_5",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { user_id } = req.body;

        const keygenEntity = serverState2.keygens.get(user_id);
        if (!keygenEntity) {
          throw new Error("not found keygen entity");
        }

        keygenEntity.keygenMessages.public_key = req.body.public_key;

        const keygen2 = runKeygenServerStep5(
          keygenEntity.keygenState,
          keygenEntity.keygenMessages,
        );
        keygenEntity.keygenOutput = keygen2;

        if (req.body.public_key !== keygen2.public_key) {
          console.error("public key is not same!");
        }

        serverState2.keygens.set(user_id, keygenEntity);

        console.log("\nkeygen_2: %j\n", keygen2);

        res.json({
          public_key: keygen2.public_key,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, KeygenStep5Response, KeygenCentralizedRequest>(
    "/keygen_centralized",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { user_id, keygen_1 } = req.body;

        serverState2.keygens.set(user_id, {
          keygenState: {} as KeyshareState,
          keygenMessages: {} as RcvdKeyshareMessages,
          keygenOutput: keygen_1,
        });

        console.log("\nkeygen_1: %j\n", keygen_1);

        res.json({
          public_key: keygen_1.public_key,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );
}
