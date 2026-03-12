import { Bytes } from "@oko-wallet/bytes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  GetReferralQuerySchema,
  GetReferralSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/social_login";
import {
  getReferralsByPublicKeyAndOrigin,
  type ReferralPublicInfo,
} from "@oko-wallet/oko-pg-interface/referrals";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Request, Response } from "express";

const CIVITIA_ORIGIN = "https://app.civitia.org";

import type { GetReferralResponse } from "@oko-wallet/oko-types/referral";

// GET /referrals/civitia - Civitia-specific referral query (no auth)
registry.registerPath({
  method: "get",
  path: "/social-login/v1/referrals/civitia",
  tags: ["Social Login"],
  summary: "Get Civitia referral information by public key",
  description:
    "Public API for Civitia to retrieve referral attribution data. Only returns referrals from Civitia origin.",
  security: [],
  request: {
    query: GetReferralQuerySchema,
  },
  responses: {
    200: {
      description:
        "Referral data retrieved successfully (empty array if none found)",
      content: {
        "application/json": {
          schema: GetReferralSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid public key format",
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

export async function referralCivitia(
  // biome-ignore lint/complexity/noBannedTypes: Express generic params
  req: Request<{}, {}, {}, { public_key: string }>,
  res: Response<OkoApiResponse<GetReferralResponse>>,
) {
  try {
    const state = req.app.locals;
    const { public_key } = req.query;

    if (!public_key || typeof public_key !== "string") {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "public_key query parameter is required",
      });
      return;
    }

    const publicKeyRes = Bytes.fromHexString(public_key, 33);
    if (!publicKeyRes.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_PUBLIC_KEY",
        msg: "Invalid public key format. Expected 33-byte hex string.",
      });
      return;
    }

    const referralsRes = await getReferralsByPublicKeyAndOrigin(
      state.db,
      Buffer.from(publicKeyRes.data.toUint8Array()),
      CIVITIA_ORIGIN,
    );

    if (!referralsRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: referralsRes.err,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        referrals: referralsRes.data.map((r: ReferralPublicInfo) => ({
          utm_source: r.utm_source,
          utm_campaign: r.utm_campaign,
          created_at: r.created_at.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Get Civitia referral error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
  }
}
