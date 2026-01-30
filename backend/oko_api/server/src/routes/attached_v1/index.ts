import { Router } from "express";

import { getTheme } from "./get_theme";

export function makeAttachedV1Router() {
  const router = Router();

  router.get("/theme/get", getTheme);

  return router;
}
