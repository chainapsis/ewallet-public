import { Client } from "@elastic/elasticsearch";
import winston from "winston";
import { ElasticsearchTransport } from "winston-elasticsearch";

const DEFAULT_LEVEL = "info";

interface LoggerOptions {
  level?: "debug" | "info" | "warn" | "error";
  esUrl: string | null;
  esIndex: string | null;
  esUsername: string | null;
  esPassword: string | null;
}

export function initLogger(options: LoggerOptions) {
  console.log("Initialize logger, options: %j", options);

  const { level, esUrl, esIndex, esUsername, esPassword } = options;

  const _level = level ?? DEFAULT_LEVEL;

  const transports: winston.transport[] = [];

  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.splat(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr =
            Object.keys(meta).length > 0
              ? "\n" + JSON.stringify(meta, null, 2)
              : "";
          return `${timestamp} ${level}: ${message}${metaStr}`;
        }),
      ),
    }),
  );

  if (esUrl && esUsername && esPassword && esIndex) {
    const esClient = new Client({
      node: esUrl,
      auth: {
        username: esUsername,
        password: esPassword,
      },
    });

    transports.push(
      new ElasticsearchTransport({
        client: esClient,
        index: esIndex,
        format: winston.format.combine(
          winston.format.splat(),
          winston.format.timestamp(),
        ),
        transformer: (logData) => {
          return {
            "@timestamp": logData.timestamp,
            "log.level": logData.level,
            message: logData.message,
            // machine_id: DEFAULT_MACHINE_ID,
            ...logData.meta,
          };
        },
      }),
    );
  }

  return winston.createLogger({
    level: _level,
    transports,
  });
}
