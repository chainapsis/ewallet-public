import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { NextFunction, Request, Response } from "express";

export function loggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const excludePaths = ["/api_docs"];
    const excludeExact = ["/"];
    if (
      excludeExact.includes(req.path) ||
      excludePaths.some((p) => req.path === p || req.path.startsWith(p + "/"))
    ) {
      return next();
    }

    const logger = req.app.locals.logger;
    if (!logger) {
      return next();
    }
    const startTime = Date.now();

    const originalSend = res.send;

    res.send = function (data) {
      const _duration = Date.now() - startTime;

      let _responseData: OkoApiResponse<any> | null = null;
      try {
        if (typeof data === "string") {
          _responseData = JSON.parse(data);
        } else {
          _responseData = data;
        }
      } catch (_e) {
        _responseData = null;
      }

      // if (responseData && responseData.success === false) {
      //   try {
      //     const logData = {
      //       message: `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`,
      //       type: "response",
      //       method: req.method,
      //       url: req.url,
      //       statusCode: res.statusCode,
      //       duration: `${duration}ms`,
      //       error: {
      //         name: responseData.code,
      //         message: responseData.msg,
      //       },
      //     };

      //     logger.error(logData);
      //   } catch (error) {
      //     console.error("Logging failed:", error.message);
      //   }
      // }

      return originalSend.call(this, data);
    };

    next();
  };
}
