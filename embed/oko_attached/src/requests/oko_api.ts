import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  OperationType,
  CommitRevealParams,
} from "@oko-wallet/oko-types/commit_reveal";
import type {
  CommitRequestBody,
  CommitResponseData,
} from "@oko-wallet/oko-api-openapi/tss";
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
): Promise<Result<OkoApiResponse<R>, FetchError>> {
  const body = commitReveal ? { ...args, ...commitReveal } : args;

  let resp: Response;
  try {
    resp = await fetch(`${baseUrl}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
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
