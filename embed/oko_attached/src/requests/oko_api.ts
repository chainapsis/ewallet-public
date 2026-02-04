import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  OperationType,
  CommitRevealParams,
} from "@oko-wallet/oko-types/commit_reveal";
import type {
  CommitRequestBody,
  CommitResponseData,
} from "@oko-wallet/oko-api-openapi/tss";
import type {
  SignInRequest,
  SignInResponseV2,
  SaveReferralRequest,
  SaveReferralResponse,
} from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";

import type { FetchError } from "./types";
import { OKO_API_ENDPOINT } from "./endpoints";

export const TSS_V1_ENDPOINT = `${OKO_API_ENDPOINT}/tss/v1`;
export const TSS_V2_ENDPOINT = `${OKO_API_ENDPOINT}/tss/v2`;
export const SOCIAL_LOGIN_V1_ENDPOINT = `${OKO_API_ENDPOINT}/social-login/v1`;
export const SOCIAL_LOGIN_V2_ENDPOINT = `${OKO_API_ENDPOINT}/social-login/v2`;

export async function makeOkoApiRequest<T, R>(
  path: string,
  args: T,
  baseUrl: string = TSS_V1_ENDPOINT,
): Promise<Result<OkoApiResponse<R>, FetchError>> {
  let resp: Response;
  try {
    resp = await fetch(`${baseUrl}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
  } catch (err: any) {
    return { success: false, err: err.toString() };
  }

  if (!resp.ok) {
    return {
      success: false,
      err: { type: "status_fail", status: resp.status },
    };
  }

  try {
    const result = (await resp.json()) as OkoApiResponse<R>;
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, err: err.toString() };
  }
}

export async function makeAuthorizedOkoApiRequest<T, R>(
  path: string,
  idToken: string,
  args: T,
  baseUrl: string = TSS_V1_ENDPOINT,
  commitReveal?: CommitRevealParams,
  apiKey?: string,
): Promise<Result<OkoApiResponse<R>, FetchError>> {
  const body = commitReveal ? { ...args, ...commitReveal } : args;

  let resp: Response;
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    resp = await fetch(`${baseUrl}/${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    return { success: false, err: err };
  }

  if (!resp.ok) {
    return {
      success: false,
      err: { type: "status_fail", status: resp.status },
    };
  }

  try {
    const result = (await resp.json()) as OkoApiResponse<R>;
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, err: err };
  }
}

export async function commitToOkoApi(
  sessionId: string,
  operationType: OperationType,
  clientEphemeralPubkey: string,
  idTokenHash: string,
): Promise<Result<OkoApiResponse<CommitResponseData>, FetchError>> {
  return makeOkoApiRequest<CommitRequestBody, CommitResponseData>(
    "commit",
    {
      session_id: sessionId,
      operation_type: operationType,
      client_ephemeral_pubkey: clientEphemeralPubkey,
      id_token_hash: idTokenHash,
    },
    TSS_V2_ENDPOINT,
  );
}

export async function signInV2(
  idToken: string,
  authType: AuthType,
  commitReveal: CommitRevealParams,
  apiKey?: string,
): Promise<
  Result<SignInResponseV2, { type: "sign_in_request_fail"; error: string }>
> {
  const signInRes = await makeAuthorizedOkoApiRequest<
    SignInRequest,
    SignInResponseV2
  >("user/signin", idToken, { auth_type: authType }, TSS_V2_ENDPOINT, commitReveal, apiKey);

  if (!signInRes.success) {
    console.error("[attached] sign in failed, err: %s", signInRes.err);
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: signInRes.err.toString() },
    };
  }

  const apiResponse = signInRes.data;
  if (!apiResponse.success) {
    console.error(
      "[attached] sign in request failed, err: %s",
      apiResponse.msg,
    );
    return {
      success: false,
      err: {
        type: "sign_in_request_fail",
        error: `code: ${apiResponse.code}`,
      },
    };
  }

  return { success: true, data: apiResponse.data };
}

export async function saveReferralV2(
  authToken: string,
  data: SaveReferralRequest,
): Promise<void> {
  const res = await makeAuthorizedOkoApiRequest<
    SaveReferralRequest,
    SaveReferralResponse
  >("referral", authToken, data, SOCIAL_LOGIN_V2_ENDPOINT);

  if (!res.success) {
    throw new Error(
      `Save referral V2 fetch failed: ${JSON.stringify(res.err)}`,
    );
  }

  const apiResponse = res.data;
  if (!apiResponse.success) {
    throw new Error(`Save referral V2 API error: ${apiResponse.msg}`);
  }
}
