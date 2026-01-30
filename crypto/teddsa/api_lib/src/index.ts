import type {
  KeygenEd25519RequestBody,
  SignEd25519Round1Body,
  SignEd25519Round1Response,
  SignEd25519Round2Body,
  SignEd25519Round2Response,
} from "@oko-wallet/oko-types/tss";
import type { SignInResponseV2 } from "@oko-wallet/oko-types/user";
import type {
  ErrorCode,
  OkoApiErrorResponse,
  OkoApiResponse,
} from "@oko-wallet/oko-types/api_response";

interface MiddlewareErrorResponse {
  error: string;
}

function isMiddlewareError(response: any): response is MiddlewareErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    typeof response.error === "string" &&
    !("success" in response)
  );
}

function mapStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "AUTHENTICATION_FAILED";
    case 404:
      return "USER_NOT_FOUND";
    case 500:
      return "UNKNOWN_ERROR";
    default:
      return "UNKNOWN_ERROR";
  }
}

function normalizeErrorResponse(
  status: number,
  responseBody: any,
): OkoApiErrorResponse {
  if (isMiddlewareError(responseBody)) {
    return {
      success: false,
      code: mapStatusToErrorCode(status),
      msg: responseBody.error,
    };
  }

  if (
    responseBody &&
    typeof responseBody === "object" &&
    "success" in responseBody
  ) {
    return responseBody;
  }

  return {
    success: false,
    code: mapStatusToErrorCode(status),
    msg: typeof responseBody === "string" ? responseBody : "Unknown error",
  };
}

async function makePostRequest<T, R>(
  endpoint: string,
  path: string,
  payload: T,
  authToken?: string,
  apiKey?: string,
): Promise<R> {
  const url = `${endpoint}/${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const ret = await fetch(url, {
    headers,
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (ret.status !== 200) {
    try {
      const error = await ret.json();
      const errorResponse: OkoApiErrorResponse = normalizeErrorResponse(
        ret.status,
        error,
      );
      return Promise.resolve(errorResponse as R);
    } catch (err: any) {
      console.error("err: %s", err);
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: err.toString(),
      } as R;
    }
  }

  return ret.json();
}

export async function reqKeygenEd25519(
  endpoint: string,
  payload: KeygenEd25519RequestBody,
  authToken: string,
) {
  const resp: OkoApiResponse<SignInResponseV2> = await makePostRequest(
    endpoint,
    "keygen_ed25519",
    payload,
    authToken,
  );
  return resp;
}

export async function reqSignEd25519Round1(
  endpoint: string,
  payload: SignEd25519Round1Body,
  authToken: string,
  apiKey?: string,
) {
  const resp: OkoApiResponse<SignEd25519Round1Response> = await makePostRequest(
    endpoint,
    "sign_ed25519/round1",
    payload,
    authToken,
    apiKey,
  );
  return resp;
}

export async function reqSignEd25519Round2(
  endpoint: string,
  payload: SignEd25519Round2Body,
  authToken: string,
) {
  const resp: OkoApiResponse<SignEd25519Round2Response> = await makePostRequest(
    endpoint,
    "sign_ed25519/round2",
    payload,
    authToken,
  );
  return resp;
}
