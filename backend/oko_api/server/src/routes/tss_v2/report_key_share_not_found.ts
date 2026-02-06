import type { Response } from "express";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  ReportKeyShareNotFoundBody,
  ReportKeyShareNotFoundResponse,
} from "@oko-wallet/oko-types/user";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";

import { reportKeyShareNotFoundV2 } from "@oko-wallet-api/api/tss/v2/user";
import { type UserAuthenticatedRequest } from "@oko-wallet-api/middleware/auth/keplr_auth";

export async function reportKeyShareNotFound(
  req: UserAuthenticatedRequest<ReportKeyShareNotFoundBody>,
  res: Response<OkoApiResponse<ReportKeyShareNotFoundResponse>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;
  const body = req.body;

  if (!body.nodes || body.nodes.length === 0) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: "nodes array is required and cannot be empty",
    });
    return;
  }

  const result = await reportKeyShareNotFoundV2(
    state.db,
    {
      wallet_id_secp256k1: user.wallet_id_secp256k1,
      wallet_id_ed25519: user.wallet_id_ed25519,
      nodes: body.nodes,
    },
    state.logger,
  );

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json({
    success: true,
    data: result.data,
  });
}
