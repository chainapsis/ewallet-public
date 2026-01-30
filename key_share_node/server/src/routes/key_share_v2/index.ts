import { Router } from "express";

import {
  bearerTokenMiddleware,
  commitRevealMiddleware,
} from "@oko-wallet-ksn-server/middlewares";
import { getKeysharesV2 } from "./get_key_shares";
import { keyshareV2Check } from "./check";
import { keyshareV2Register } from "./register";
import { registerKeyshareEd25519 } from "./ed25519";
import { keyshareV2Reshare } from "./reshare";
import { keyshareV2ReshareRegister } from "./reshare_register";
import { commit } from "./commit";

export function makeKeyshareV2Router() {
  const router = Router();

  router.post(
    "/",
    commitRevealMiddleware("get_key_shares"),
    bearerTokenMiddleware,
    getKeysharesV2,
  );

  router.post("/check", keyshareV2Check);

  router.post(
    "/register",
    commitRevealMiddleware("register"),
    bearerTokenMiddleware,
    keyshareV2Register,
  );

  router.post(
    "/register/ed25519",
    commitRevealMiddleware("register_ed25519"),
    bearerTokenMiddleware,
    registerKeyshareEd25519,
  );

  router.post(
    "/reshare",
    commitRevealMiddleware("reshare"),
    bearerTokenMiddleware,
    keyshareV2Reshare,
  );

  router.post(
    "/reshare/register",
    commitRevealMiddleware("reshare_register"),
    bearerTokenMiddleware,
    keyshareV2ReshareRegister,
  );

  router.post("/commit", commit);

  return router;
}
