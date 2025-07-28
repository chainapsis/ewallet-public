import type { Express } from "express";

import { makeKeyshareRouter } from "./key_share";
import { makeCommitRouter } from "./commit";

export function setRoutes(app: Express) {
  const keyshareRouter = makeKeyshareRouter();
  app.use("/keyshare/v1", keyshareRouter);
  
  const commitRouter = makeCommitRouter();
  app.use("/commit/v1", commitRouter);
}
