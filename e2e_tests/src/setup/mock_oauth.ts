import type { Request, Response, NextFunction } from "express";

export function mockOAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const mockUserId = req.headers["x-mock-user-id"] as string;
  const authType = (req.body?.auth_type ?? "google") as string;

  if (!mockUserId) {
    res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "x-mock-user-id header required for testing",
    });
    return;
  }

  res.locals.oauth_user = {
    type: authType,
    user_identifier: mockUserId,
  };

  next();
}
