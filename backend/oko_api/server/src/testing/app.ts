import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import winston from "winston";

import { makeTSSRouterV1 } from "@oko-wallet-api/routes/tss_v1";
import { makeTSSRouterV2 } from "@oko-wallet-api/routes/tss_v2";

const testLogger = winston.createLogger({
  level: "error",
  silent: true,
  transports: [new winston.transports.Console()],
});

export interface TestEnvsTss {
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ENCRYPTION_SECRET: string;
}

export interface TestEnvsLog {
  ES_URL: string;
  ES_INDEX: string;
  ES_USERNAME: string;
  ES_PASSWORD: string;
}

export type TestEnvs = TestEnvsTss | TestEnvsLog;

export function makeApp(env: TestEnvs) {
  const app = express();

  app.use(morgan("dev"));
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get<{}, string>("/", (_, res) => {
    res.send("Ok");
  });

  app.use("/tss/v1", makeTSSRouterV1());
  app.use("/tss/v2", makeTSSRouterV2());

  const e = env as any;
  app.locals.jwt_secret = e.JWT_SECRET;
  app.locals.jwt_expires_in = e.JWT_EXPIRES_IN;
  app.locals.encryption_secret = e.ENCRYPTION_SECRET;
  app.locals.logger = testLogger;

  return app;
}
