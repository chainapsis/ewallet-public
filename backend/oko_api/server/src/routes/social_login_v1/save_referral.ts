import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  SaveReferralRequestSchema,
  SaveReferralSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/social_login";
import { getWalletById } from "@oko-wallet/oko-pg-interface/oko_wallets";
import { createReferral } from "@oko-wallet/oko-pg-interface/referrals";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  SaveReferralRequest,
  SaveReferralResponse,
} from "@oko-wallet/oko-types/referral";
import type { Request, Response } from "express";

registry.registerPath({
  method: "post",
  path: "/social-login/v1/referral",
  tags: ["Social Login"],
  summary: "Save referral information",
  description: "Records referral attribution data after successful keygen",
  security: [{ userAuth: [] }],
  request: {
    headers: UserAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SaveReferralRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Referral saved successfully",
      content: {
        "application/json": {
          schema: SaveReferralSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export async function saveReferral(
  req: Request<any, any, SaveReferralRequest>,
  res: Response<OkoApiResponse<SaveReferralResponse>>,
) {
  try {
    const state = req.app.locals;
    const { wallet_id } = res.locals.user;
    const { origin, utm_source, utm_campaign } = req.body;

    if (!origin) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "origin is required",
      });
      return;
    }

    // Get wallet to retrieve user_id and public_key
    const walletRes = await getWalletById(state.db, wallet_id);
    if (!walletRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: walletRes.err,
      });
      return;
    }

    if (!walletRes.data) {
      res.status(404).json({
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "Wallet not found",
      });
      return;
    }

    const wallet = walletRes.data;

    const createRes = await createReferral(state.db, {
      user_id: wallet.user_id,
      public_key: wallet.public_key,
      origin,
      utm_source: utm_source ?? null,
      utm_campaign: utm_campaign ?? null,
    });

    if (!createRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: createRes.err,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { referral_id: createRes.data.referral_id },
    });
  } catch (error) {
    console.error("Save referral error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
  }
}
