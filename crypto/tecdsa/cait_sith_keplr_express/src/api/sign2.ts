import {
  runSignServerStep1,
  runSignServerStep1V2,
  runSignServerStep2,
} from "@oko-wallet/cait-sith-keplr-addon/src/server";
import type {
  SignStep1Response,
  SignStep1V2Request,
  SignStep1V3Request,
  SignStep2Response,
  SignStep2V2Request,
} from "@oko-wallet/tecdsa-interface";
import type { Router } from "express";

import { appServerState } from "../state";

export function setSignRoutes2(router: Router) {
  router.post<object, SignStep1Response, SignStep1V2Request>(
    "/sign_step_1",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id } = req.body;

        const presignEntity = serverState2.presigns.get(session_id);
        if (!presignEntity || !presignEntity.presignOutput) {
          throw new Error("not found presign entity");
        }

        const signServerStep1Result = runSignServerStep1(
          req.body.msg,
          presignEntity.presignOutput,
        );

        serverState2.signs.set(session_id, {
          signState: signServerStep1Result.st_1,
          signMessages: req.body.msgs_1,
        });

        res.json({ msgs_0: signServerStep1Result.msgs_0 });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, SignStep1Response, SignStep1V3Request>(
    "/sign_step_1_v3",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { session_id } = req.body;

        const presignEntity = serverState2.presigns.get(session_id);
        if (!presignEntity || !presignEntity.presignOutput) {
          throw new Error("not found presign entity");
        }

        const signServerStep1Result = runSignServerStep1V2(
          new Uint8Array(req.body.msg),
          presignEntity.presignOutput,
        );

        serverState2.signs.set(session_id, {
          signState: signServerStep1Result.st_1,
          signMessages: req.body.msgs_1,
        });

        res.json({ msgs_0: signServerStep1Result.msgs_0 });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, SignStep2Response, SignStep2V2Request>(
    "/sign_step_2",
    (req, res) => {
      try {
        const { serverState2 } = appServerState;
        const { user_id, session_id, sig } = req.body;

        const keygenEntity = serverState2.keygens.get(user_id);
        if (!keygenEntity || !keygenEntity.keygenOutput) {
          throw new Error("not found keygen entity");
        }

        const presignEntity = serverState2.presigns.get(session_id);
        if (!presignEntity || !presignEntity.presignOutput) {
          throw new Error("not found presign entity");
        }

        const signEntity = serverState2.signs.get(session_id);
        if (!signEntity) {
          throw new Error("not found sign entity");
        }

        const signOutput = runSignServerStep2(
          signEntity.signState!,
          signEntity.signMessages!,
          presignEntity.presignOutput,
        );

        if (signOutput.sig.big_r !== sig.big_r || signOutput.sig.s !== sig.s) {
          throw new Error("sign failed. big_r or s do not match");
        }

        console.log("\nsign output: %j\n", signOutput);

        res.json(signOutput);
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );
}
