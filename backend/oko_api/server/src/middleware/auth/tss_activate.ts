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
      res.status(500).json({
        error: `getTssActivationSetting error: ${result.err}`,
      });
      return;
    }

    if (!result.data) {
      res.status(500).json({
        error: "TSS activation setting not found",
      });
      return;
    }

    if (!result.data.is_enabled) {
      res.status(200).json({
        error: "Server is not working",
      });
      return;
    }

    next();
    return;
  } catch (error) {
    res.status(500).json({
      error: `Internal server error: ${error}`,
    });
    return;
  }
}
