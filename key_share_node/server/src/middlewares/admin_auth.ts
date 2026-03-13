import type { KSNodeApiErrorResponse } from "@oko-wallet/ksn-interface/response";
import { pbkdf2, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { promisify } from "util";

import { ErrorCodeMap } from "@oko-wallet-ksn-server/error";

const pbkdf2Async = promisify(pbkdf2);

export interface AdminAuthenticatedRequest<T = any> extends Request {
  body: T;
}

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";
const PBKDF2_SALT = Buffer.from("ksn-admin-auth", "utf8");

async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([
    pbkdf2Async(
      a,
      PBKDF2_SALT,
      PBKDF2_ITERATIONS,
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST,
    ),
    pbkdf2Async(
      b,
      PBKDF2_SALT,
      PBKDF2_ITERATIONS,
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST,
    ),
  ]);
  return timingSafeEqual(hashA, hashB);
}

export async function adminAuthMiddleware(
  req: AdminAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!password || typeof password !== "string") {
    const errorRes: KSNodeApiErrorResponse = {
      success: false,
      code: "UNAUTHORIZED",
      msg: "Admin password is required",
    };
    return res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
  }

  if (!adminPassword || !(await timingSafeCompare(password, adminPassword))) {
    const errorRes: KSNodeApiErrorResponse = {
      success: false,
      code: "UNAUTHORIZED",
      msg: "Invalid admin password",
    };
    return res.status(ErrorCodeMap[errorRes.code]).json(errorRes);
  }

  next();
  return;
}
