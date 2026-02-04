import type {
  CheckEmailRequest,
  CheckEmailResponseV2,
} from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";

import {
  makeOkoApiRequest,
  TSS_V2_ENDPOINT,
} from "@oko-wallet-attached/requests/oko_api";
import type { FetchError } from "@oko-wallet-attached/requests/types";

export async function checkUserExistsV2(
  email: string,
  authType: AuthType,
): Promise<Result<OkoApiResponse<CheckEmailResponseV2>, FetchError>> {
  const res = await makeOkoApiRequest<CheckEmailRequest, CheckEmailResponseV2>(
    "user/check",
    {
      email,
      auth_type: authType,
    },
    TSS_V2_ENDPOINT,
  );

  return res;
}
