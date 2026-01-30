import type { Logger } from "winston";
import { z } from "zod";
import type { PostLogBody, PostLogResponse } from "@oko-wallet/oko-types/log";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";

export function ingestLog(
  log: PostLogBody,
  clientLogger: Logger,
): OkoApiResponse<PostLogResponse> {
  try {
    let parsedLog: PostLogBody;
    try {
      parsedLog = logSchema.parse(log);
    } catch (error) {
      return {
        success: false,
        code: "INVALID_LOG",
        msg: `Invalid log: ${String(error)}`,
      };
    }

    const serverTimestamp = new Date().toISOString();

    clientLogger.log({ ...parsedLog, ingestedAt: serverTimestamp });
    return {
      success: true,
      data: {
        ingestedAt: serverTimestamp,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `ingestLog error: ${String(error)}`,
    };
  }
}

const logSchema = z.object({
  level: z.enum(["error", "warn", "info"]),
  message: z.string(),
  timestamp: z.string().default(new Date().toISOString()),
  error: z
    .object({
      name: z.string(),
      message: z.string(),
      stack: z.string().optional(),
      fileName: z.string().optional(),
      lineNumber: z.number().optional(),
      columnNumber: z.number().optional(),
    })
    .optional(),
  session: z
    .object({
      sessionId: z.string().optional(),
      pageUrl: z.string().optional(),
      email: z.string().optional(),
      customerId: z.string().optional(),
    })
    .optional(),
  clientInfo: z.object({
    userAgent: z.string(),
    platform: z.string(),
    screen: z.object({
      width: z.number(),
      height: z.number(),
    }),
  }),
  meta: z.record(z.string(), z.any()).optional(),
});
