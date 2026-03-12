import {
  runPresignServerStep1,
  runPresignServerStep2,
  runPresignServerStep3,
} from "@oko-wallet/cait-sith-keplr-addon/src/server";
import type {
  PresignStep1Response,
  PresignStep1V2Request,
  PresignStep2Response,
  PresignStep2V2Request,
  PresignStep3Response,
  PresignStep3V2Request,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";
import type { Router } from "express";

import { appServerState } from "../state";

export function setPresignRoutes2(router: Router) {
  router.post<object, PresignStep1Response, PresignStep1V2Request>(
    "/presign_step_1",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { user_id, session_id } = req.body;

        // 현재는 user_id, session_id 간의 유효성 검증 미수행
        const keygenEntity = serverState2.keygens.get(user_id);
        if (!keygenEntity || !keygenEntity.keygenOutput) {
          throw new Error("not found keygen entity");
        }

        const triplesEntity = serverState2.triples.get(session_id);
        if (!triplesEntity) {
          throw new Error("not found triples entity");
        }

        const presignServerStep1Result = runPresignServerStep1(
          triplesEntity.triple0Pub!,
          triplesEntity.triple1Pub!,
          triplesEntity.triple0Share!,
          triplesEntity.triple1Share!,
          keygenEntity.keygenOutput,
        );

        serverState2.presigns.set(session_id, {
          presignState: presignServerStep1Result.state,
          presignMessages: req.body.msgs_1,
          presignOutput: null,
        });

        res.json({
          msgs_0: presignServerStep1Result.msgs0,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, PresignStep2Response, PresignStep2V2Request>(
    "/presign_step_2",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id } = req.body;

        const presignEntity = serverState2.presigns.get(session_id);
        if (!presignEntity) {
          throw new Error("not found presign entity");
        }

        presignEntity.presignMessages.wait_1[Participant.P0] =
          req.body.wait_1_0_1;

        const presignServerStep2Result = runPresignServerStep2(
          presignEntity.presignState!,
        );
        presignEntity.presignState = presignServerStep2Result.state;

        serverState2.presigns.set(session_id, presignEntity);

        res.json({
          wait_1_1_0: presignServerStep2Result.msgs0.wait_1[Participant.P1]!,
        });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, PresignStep3Response, PresignStep3V2Request>(
    "/presign_step_3",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id } = req.body;

        const presignEntity = serverState2.presigns.get(session_id);
        if (!presignEntity) {
          throw new Error("not found presign entity");
        }

        const presignServerStep3Result = runPresignServerStep3(
          presignEntity.presignState!,
          presignEntity.presignMessages,
        );
        presignEntity.presignOutput = presignServerStep3Result;

        if (
          req.body.presign_output.big_r !== presignEntity.presignOutput.big_r
        ) {
          throw new Error("presign failed. big_r do not match");
        }

        serverState2.presigns.set(session_id, presignEntity);

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
