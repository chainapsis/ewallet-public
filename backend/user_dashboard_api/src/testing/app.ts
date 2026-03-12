import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { setCustomerRoutes } from "@oko-wallet-usrd-api/routes/customer";

dotenv.config();

export function makeApp() {
  const app = express();

  app.use(morgan("dev"));
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // biome-ignore lint/complexity/noBannedTypes: Express generic params
  app.get<{}, string>("/", (_, res) => {
    res.send("Ok");
  });

  setCustomerRoutes(app);

  return app;
}
