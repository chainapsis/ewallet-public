import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { config as dotenvConfig } from "dotenv";

import { installSwaggerDocs } from "@keplr-ewallet-cv-server/swagger";
import { setRoutes } from "@keplr-ewallet-cv-server/routes";

dotenvConfig();

export function makeApp() {
  const app = express();

  app.use(morgan("dev"));
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get<{}, string>("/", (_, res) => {
    res.send("Ok");
  });

  setRoutes(app);

  installSwaggerDocs(app);

  return app;
}
