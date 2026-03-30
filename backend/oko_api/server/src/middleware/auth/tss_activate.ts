import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { getTssActivationSetting } from "@oko-wallet/oko-pg-interface/tss_activate";
import type { NextFunction, Request, Response } from "express";

export async function tssActivateMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const state = req.app.locals;

  try {
    const result = await getTssActivationSetting(state.db, "tss_all");

    if (!result.success) {
      res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssActivationSetting error: ${result.err}`,
      });
      return;
    }

    if (!result.data) {
      res.status(ErrorCodeMap.TSS_ACTIVATION_SETTING_NOT_FOUND).json({
        success: false,
        code: "TSS_ACTIVATION_SETTING_NOT_FOUND",
        msg: "TSS activation setting not found",
      });
      return;
    }

    if (!result.data.is_enabled) {
      res.status(ErrorCodeMap.SERVICE_UNAVAILABLE).json({
        success: false,
        code: "SERVICE_UNAVAILABLE",
        msg: "Server is not working",
      });
      return;
    }

    next();
    return;
  } catch (error) {
    res.status(ErrorCodeMap.UNKNOWN_ERROR).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
