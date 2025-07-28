import express from "express";

import { setKeysharesRoutes } from "./key_share";

export function makeKeyshareRouter() {
  const router = express.Router();

  setKeysharesRoutes(router);

  return router;
}
