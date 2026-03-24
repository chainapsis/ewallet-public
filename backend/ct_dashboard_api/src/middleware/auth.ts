import { getCTDUserByUserIdAndCustomerId } from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { getCustomerByUserId } from "@oko-wallet/oko-pg-interface/customers";
import type { NextFunction, Request, Response } from "express";

import { verifyCustomerToken } from "@oko-wallet-ctd-api/auth";

export interface CustomerAuthenticatedRequest<T = any> extends Request {
  body: T;
}

export async function customerJwtMiddleware(
  req: CustomerAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Authorization header with Bearer token required" });
    return;
  }

  const token = authHeader.substring(7); // skip "Bearer "

  try {
    const state = req.app.locals;
    const result = verifyCustomerToken({
      token,
      jwt_config: {
        secret: state.jwt_secret,
      },
    });

    if (!result.success) {
      res
        .status(401)
        .json({ error: `Token verification failed: ${result.error}` });
      return;
    }

    if (!result.payload) {
      res.status(500).json({
        error: "Internal server error: Token payload missing after validation",
      });
      return;
    }

    if (
      !result.payload.sub ||
      typeof result.payload.sub !== "string" ||
      result.payload.type !== "customer"
    ) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    res.locals.user_id = result.payload.sub;

    next();
    return;
  } catch (error) {
    res.status(500).json({
      error: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}

export interface TeamContext {
  customer_id: string;
  label: string;
  role: string;
}

/**
 * Resolves the team member context from JWT user_id.
 * Sets res.locals.team = { customer_id, label, role }.
 * Must be used after customerJwtMiddleware.
 */
export async function resolveTeamMember(
  req: CustomerAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const state = req.app.locals;
    const userId = res.locals.user_id;

    const customerRes = await getCustomerByUserId(state.db, userId);
    if (!customerRes.success || customerRes.data === null) {
      res.status(404).json({
        success: false,
        code: "CUSTOMER_NOT_FOUND",
        msg: "Customer not found",
      });
      return;
    }

    const customer = customerRes.data;
    const memberRes = await getCTDUserByUserIdAndCustomerId(
      state.db,
      userId,
      customer.customer_id,
    );

    if (!memberRes.success || memberRes.data === null) {
      res.status(404).json({
        success: false,
        code: "TEAM_MEMBER_NOT_FOUND",
        msg: "Team member not found",
      });
      return;
    }

    res.locals.team = {
      customer_id: customer.customer_id,
      label: customer.label,
      role: memberRes.data.role,
    } satisfies TeamContext;

    next();
    return;
  } catch (_error) {
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}

/**
 * Requires the authenticated user to have 'admin' role.
 * Must be used after resolveTeamMember.
 */
export async function requireAdmin(
  _req: CustomerAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (res.locals.team?.role !== "admin") {
    res.status(403).json({
      success: false,
      code: "FORBIDDEN",
      msg: "Admin role required",
    });
    return;
  }

  next();
  return;
}
