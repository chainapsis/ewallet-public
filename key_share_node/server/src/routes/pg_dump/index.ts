import type { GetBackupHistoryRequest } from "@oko-wallet/ksn-interface/db_backup";
import type {
  KSNodeApiErrorResponse,
  KSNodeApiResponse,
} from "@oko-wallet/ksn-interface/response";
import { getAllPgDumps, type PgDump } from "@oko-wallet/ksn-pg-interface";
import { type Response, Router } from "express";

import { ErrorCodeMap } from "@oko-wallet-ksn-server/error";
import {
  type AdminAuthenticatedRequest,
  type RateLimitMiddlewareOption,
  rateLimitMiddleware,
} from "@oko-wallet-ksn-server/middlewares";
import { registry } from "@oko-wallet-ksn-server/openapi/doc";
import {
  ErrorResponseSchema,
  PgDumpHistoryQuerySchema,
  PgDumpHistorySuccessResponseSchema,
} from "@oko-wallet-ksn-server/openapi/schema";

const isTest = process.env.NODE_ENV === "test";

const ADMIN_RATE_LIMIT: RateLimitMiddlewareOption = {
  windowSeconds: 60,
  maxRequests: 5,
};

export function makePgDumpRouter() {
  const router = Router();

  registry.registerPath({
    method: "post",
    path: "/pg_dump/v1/get_backup_history",
    tags: ["PG Dump"],
    summary: "Get pg dump history",
    description: "Get pg dump history for the specified number of days.",
    request: {
      query: PgDumpHistoryQuerySchema,
    },
    responses: {
      200: {
        description: "Successfully retrieved pg dump history",
        content: {
          "application/json": {
            schema: PgDumpHistorySuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid days parameter",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
            examples: {
              INVALID_DAYS: {
                value: {
                  success: false,
                  code: "INVALID_DAYS",
                  msg: "Days parameter must be between 1 and 1000",
                },
              },
            },
          },
        },
      },
      500: {
        description: "Failed to retrieve pg dump history",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
            examples: {
              UNKNOWN_ERROR: {
                value: {
                  success: false,
                  code: "UNKNOWN_ERROR",
                  msg: "Failed to retrieve pg dump history",
                },
              },
            },
          },
        },
      },
    },
  });
  router.post(
    "/get_backup_history",
    ...(isTest ? [] : [rateLimitMiddleware(ADMIN_RATE_LIMIT)]),
    async (
      req: AdminAuthenticatedRequest<GetBackupHistoryRequest>,
      res: Response<KSNodeApiResponse<PgDump[]>>,
    ) => {
      const { days } = req.body;
      const state = req.app.locals;

      const dumpsResult = await getAllPgDumps(state.db, days);
      if (dumpsResult.success === false) {
        const errorRes: KSNodeApiErrorResponse = {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: dumpsResult.err,
        };
        return res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
      }

      return res.status(200).json({
        success: true,
        data: dumpsResult.data,
      });
    },
  );

  // registry.registerPath({
  //   method: "post",
  //   path: "/pg_dump/v1/backup",
  //   tags: ["PG Dump"],
  //   summary: "Request a pg dump",
  //   description: "Request a pg dump.",
  //   request: {
  //     body: {
  //       required: true,
  //       content: {
  //         "application/json": {
  //           schema: PgDumpRequestBodySchema,
  //         },
  //       },
  //     },
  //   },
  //   responses: {
  //     200: {
  //       description: "Successfully requested pg dump",
  //       content: {
  //         "application/json": {
  //           schema: PgDumpSuccessResponseSchema,
  //         },
  //       },
  //     },
  //     401: {
  //       description: "Invalid admin password",
  //       content: {
  //         "application/json": {
  //           schema: ErrorResponseSchema,
  //           examples: {
  //             UNAUTHORIZED: {
  //               value: {
  //                 success: false,
  //                 code: "UNAUTHORIZED",
  //                 msg: "Invalid admin password",
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //     500: {
  //       description: "Failed to process pg dump",
  //       content: {
  //         "application/json": {
  //           schema: ErrorResponseSchema,
  //           examples: {
  //             PG_DUMP_FAILED: {
  //               value: {
  //                 success: false,
  //                 code: "PG_DUMP_FAILED",
  //                 msg: "Failed to process pg dump",
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  // });
  // router.post(
  //   "/backup",
  //   ...(isTest ? [] : [rateLimitMiddleware(ADMIN_RATE_LIMIT)]),
  //   adminAuthMiddleware,
  //   async (
  //     req: AdminAuthenticatedRequest,
  //     res: Response<KSNodeApiResponse<PgDumpResult>>,
  //   ) => {
  //     const state = req.app.locals;

  //     const processPgDumpRes = await processPgDump(
  //       state.db,
  //       {
  //         database: process.env.DB_NAME,
  //         host: process.env.DB_HOST,
  //         password: process.env.DB_PASSWORD,
  //         user: process.env.DB_USER,
  //         port: Number(process.env.DB_PORT),
  //       },
  //       process.env.DUMP_DIR,
  //     );
  //     if (processPgDumpRes.success === false) {
  //       const errorRes: KSNodeApiErrorResponse = {
  //         success: false,
  //         code: "PG_DUMP_FAILED",
  //         msg: processPgDumpRes.err,
  //       };
  //       return res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
  //     }

  //     return res.status(200).json({
  //       success: true,
  //       data: processPgDumpRes.data,
  //     });
  //   },
  // );

  // registry.registerPath({
  //   method: "post",
  //   path: "/pg_dump/v1/restore",
  //   tags: ["PG Dump"],
  //   summary: "Restore a pg dump",
  //   description: "Restore a pg dump.",
  //   request: {
  //     body: {
  //       required: true,
  //       content: {
  //         "application/json": {
  //           schema: PgRestoreRequestBodySchema,
  //         },
  //       },
  //     },
  //   },
  //   responses: {
  //     200: {
  //       description: "Successfully restored pg dump",
  //       content: {
  //         "application/json": {
  //           schema: PgRestoreSuccessResponseSchema,
  //         },
  //       },
  //     },
  //     400: {
  //       description: "Invalid dump_path parameter or file not found",
  //       content: {
  //         "application/json": {
  //           schema: ErrorResponseSchema,
  //           examples: {
  //             INVALID_DUMP_PATH: {
  //               summary: "Invalid dump_path parameter",
  //               value: {
  //                 success: false,
  //                 code: "INVALID_DUMP_PATH",
  //                 msg: "dump_path parameter is required",
  //               },
  //             },
  //             DUMP_FILE_NOT_FOUND: {
  //               summary: "Dump file not found",
  //               value: {
  //                 success: false,
  //                 code: "DUMP_FILE_NOT_FOUND",
  //                 msg: "Dump file not found at path: /path/to/dump.sql",
  //               },
  //             },
  //             INVALID_DUMP_FILE: {
  //               summary: "Path is not a file",
  //               value: {
  //                 success: false,
  //                 code: "INVALID_DUMP_FILE",
  //                 msg: "Path is not a file: /path/to/dump.sql",
  //               },
  //             },
  //             DUMP_FILE_ACCESS_ERROR: {
  //               summary: "Cannot access dump file",
  //               value: {
  //                 success: false,
  //                 code: "DUMP_FILE_ACCESS_ERROR",
  //                 msg: "Cannot access dump file: /path/to/dump.sql",
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //     401: {
  //       description: "Invalid admin password",
  //       content: {
  //         "application/json": {
  //           schema: ErrorResponseSchema,
  //           examples: {
  //             UNAUTHORIZED: {
  //               value: {
  //                 success: false,
  //                 code: "UNAUTHORIZED",
  //                 msg: "Invalid admin password",
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //     500: {
  //       description: "Failed to restore pg dump",
  //       content: {
  //         "application/json": {
  //           schema: ErrorResponseSchema,
  //           examples: {
  //             PG_RESTORE_FAILED: {
  //               value: {
  //                 success: false,
  //                 code: "PG_RESTORE_FAILED",
  //                 msg: "Failed to restore pg dump",
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  // });
  // router.post(
  //   "/restore",
  //   ...(isTest ? [] : [rateLimitMiddleware(RESTORE_RATE_LIMIT)]),
  //   adminAuthMiddleware,
  //   async (
  //     req: AdminAuthenticatedRequest<DBRestoreRequest>,
  //     res: Response<KSNodeApiResponse<DBRestoreResponse>>,
  //   ) => {
  //     const dumpPath = req.body.dump_path;

  //     if (!dumpPath) {
  //       const errorRes: KSNodeApiErrorResponse = {
  //         success: false,
  //         code: "INVALID_DUMP_PATH",
  //         msg: "dump_path parameter is required",
  //       };
  //       return res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
  //     }

  //     try {
  //       await fs.access(dumpPath);
  //     } catch (error) {
  //       const errorRes: KSNodeApiErrorResponse = {
  //         success: false,
  //         code: "DUMP_FILE_NOT_FOUND",
  //         msg: `Dump file not found at path: ${dumpPath}`,
  //       };
  //       return res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
  //     }

  //     try {
  //       const stats = await fs.stat(dumpPath);
  //       if (!stats.isFile()) {
  //         const errorRes: KSNodeApiErrorResponse = {
  //           success: false,
  //           code: "INVALID_DUMP_FILE",
  //           msg: `Path is not a file: ${dumpPath}`,
  //         };
  //         return res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
  //       }
  //     } catch (error) {
  //       const errorRes: KSNodeApiErrorResponse = {
  //         success: false,
  //         code: "DUMP_FILE_ACCESS_ERROR",
  //         msg: `Cannot access dump file: ${dumpPath}`,
  //       };
  //       return res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
  //     }

  //     const restoreRes = await restore(
  //       {
  //         database: process.env.DB_NAME,
  //         host: process.env.DB_HOST,
  //         password: process.env.DB_PASSWORD,
  //         user: process.env.DB_USER,
  //         port: Number(process.env.DB_PORT),
  //       },
  //       dumpPath,
  //     );
  //     if (restoreRes.success === false) {
  //       const errorRes: KSNodeApiErrorResponse = {
  //         success: false,
  //         code: "PG_RESTORE_FAILED",
  //         msg: restoreRes.err,
  //       };
  //       return res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
  //     }

  //     return res.status(200).json({
  //       success: true,
  //       data: {
  //         dump_path: dumpPath,
  //       },
  //     });
  //   },
  // );

  return router;
}
