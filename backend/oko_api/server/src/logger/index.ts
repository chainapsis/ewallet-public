import winston from "winston";
import { Client } from "@elastic/elasticsearch";
import { ElasticsearchTransport } from "winston-elasticsearch";

const DEFAULT_LEVEL = "info";

interface ClientLoggerOptions {
  level?: "debug" | "info" | "warn" | "error";
  esUrl: string | null;
  esIndex: string | null;
  esUsername: string | null;
  esPassword: string | null;
  console?: boolean;
}

export function initClientLogger(options: ClientLoggerOptions) {
  console.log("Initialize client logger, options: %j", options);

  const {
    level,
    esUrl,
    esIndex,
    esUsername,
    esPassword,
    console: enableConsole = true,
  } = options;

  const _level = level ?? DEFAULT_LEVEL;

  const transports: winston.transport[] = [];

  if (enableConsole) {
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
            return `${timestamp} [CLIENT-LOG] ${level}: ${message}${metaStr}`;
          }),
        ),
      }),
    );
  }

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
            "log.type": "client",
            message: logData.message,
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
