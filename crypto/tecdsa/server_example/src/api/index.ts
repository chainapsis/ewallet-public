import {
  setKeygenRoutes,
  setPresignRoutes,
  setSignRoutes,
} from "@oko-wallet/cait-sith-keplr-express/src/api";
import express from "express";

const router = express.Router();

setKeygenRoutes(router);
setPresignRoutes(router);
setSignRoutes(router);

export default router;
