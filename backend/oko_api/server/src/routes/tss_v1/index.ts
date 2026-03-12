import { Router } from "express";

import { setKeygenV1Routes } from "./keygen";
import { setKSNodeTelemetryRoutes } from "./ks_node_telemetry";
import { setPresignV1Routes } from "./presign";
import { setSignV1Routes } from "./sign";
import { setTriplesV1Routes } from "./triples";
import { setTssSessionRoutes } from "./tss_session";
import { setUserV1Routes } from "./user";

export function makeTSSRouterV1() {
  const router = Router();

  setKeygenV1Routes(router);
  setTriplesV1Routes(router);
  setPresignV1Routes(router);
  setSignV1Routes(router);
  setUserV1Routes(router);

  setTssSessionRoutes(router);
  setKSNodeTelemetryRoutes(router);

  return router;
}
