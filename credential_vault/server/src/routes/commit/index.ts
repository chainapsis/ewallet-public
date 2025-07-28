import express from "express";

import { setCommitRoutes } from "./commit";

export function makeCommitRouter() {
  const router = express.Router();

  setCommitRoutes(router);

  return router;
}
