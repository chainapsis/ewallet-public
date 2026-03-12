import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import api from "./api";
import v2 from "./api/v2";
import * as middlewares from "./middlewares";

require("dotenv").config();

const app = express();

app.locals = app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get<object, string>("/", (_, res) => {
  res.send("Ok");
});

app.use("/v1", api);
app.use("/v2", v2);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
