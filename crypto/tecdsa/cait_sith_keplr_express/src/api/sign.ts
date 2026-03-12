import {
  runSignServerStep1,
  runSignServerStep2,
} from "@oko-wallet/cait-sith-keplr-addon/src/server";
import type {
  SignStep1Request,
  SignStep1Response,
  SignStep2Request,
  SignStep2Response,
} from "@oko-wallet/tecdsa-interface";
import type { Router } from "express";

import { appServerState } from "../state";

export function setSignRoutes(router: Router) {
  router.post<object, SignStep1Response, SignStep1Request>(
    "/sign_step_1",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        serverState.signMessages = req.body.msgs_1;
        const signServerStep1Result = runSignServerStep1(
          req.body.msg,
          serverState.presignOutput!,
        );
        serverState.signState = signServerStep1Result.st_1;

        res.json({ msgs_0: signServerStep1Result.msgs_0 });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.post<object, SignStep2Response, SignStep2Request>(
    "/sign_step_2",
    (req, res) => {
      try {
        const { serverState } = appServerState;
        const { sig } = req.body;

        const signOutput = runSignServerStep2(
          serverState.signState!,
          serverState.signMessages!,
          serverState.presignOutput!,
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
