import type {
  KeygenStep1Response,
  KeygenStep1V2Request,
  KeygenStep2Response,
  KeygenStep2V2Request,
  KeygenStep3Response,
  KeygenStep3V2Request,
  KeygenStep4Response,
  KeygenStep4V2Request,
  KeygenStep5Response,
  KeygenStep5V2Request,
} from "@oko-wallet/tecdsa-interface";
import type {
  KeygenRequestBody,
  PresignStep1Response,
  PresignStep2Response,
  PresignStep3Response,
  SignStep1Response,
  SignStep2Response,
  TriplesStep10Response,
  TriplesStep11Response,
  TriplesStep1Response,
  TriplesStep2Response,
  TriplesStep3Response,
  TriplesStep4Response,
  TriplesStep5Response,
  TriplesStep6Response,
  TriplesStep7Response,
  TriplesStep8Response,
  TriplesStep9Response,
  TriplesStep1Body,
  TriplesStep2Body,
  TriplesStep3Body,
  TriplesStep4Body,
  TriplesStep5Body,
  TriplesStep6Body,
  TriplesStep7Body,
  TriplesStep8Body,
  TriplesStep9Body,
  TriplesStep10Body,
  TriplesStep11Body,
  PresignStep1Body,
  PresignStep2Body,
  PresignStep3Body,
  SignStep1Body,
  SignStep2Body,
  AbortTssSessionBody,
  AbortTssSessionResponse,
} from "@oko-wallet/oko-types/tss";
import {
  type SignInResponse,
  type SignInResponseV2,
} from "@oko-wallet/oko-types/user";
import type { KeygenRequestBodyV2 } from "@oko-wallet/oko-types/tss";
import {
  type ErrorCode,
  type OkoApiErrorResponse,
  type OkoApiResponse,
} from "@oko-wallet/oko-types/api_response";

/* NOTE - The error type returned by the middleware is not compatible with OkoApiErrorResponse.
   So we use a separate function to handle it.
   If the error type is modified in the middleware to be compatible with OkoApiErrorResponse,
   this code should be deleted @retto
*/
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
  apiKey?: string,
  authToken?: string,
): Promise<R> {
  const url = `${endpoint}/${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const ret = await fetch(url, {
    headers,
    method: "POST",
    body: JSON.stringify(payload),
  });

  // const newToken = ret.headers.get("X-New-Token");
  //
  // if (newToken) {
  //   onAuthTokenRefresh(newToken);
  // }

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

      // return normalizeErrorResponse(
      //   ret.status,
      //   "Failed to read error response",
      // );
    }
  }

  return ret.json();
}

export async function reqKeygen(
  endpoint: string,
  payload: KeygenRequestBody,
  authToken: string,
) {
  const resp: OkoApiResponse<SignInResponse> = await makePostRequest(
    endpoint,
    "keygen",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqKeygenV2(
  endpoint: string,
  payload: KeygenRequestBodyV2,
  authToken: string,
) {
  const resp: OkoApiResponse<SignInResponseV2> = await makePostRequest(
    endpoint,
    "keygen",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep1(
  endpoint: string,
  payload: TriplesStep1Body,
  apiKey: string,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep1Response> = await makePostRequest(
    endpoint,
    "triples/step1",
    payload,
    apiKey,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep2(
  endpoint: string,
  payload: TriplesStep2Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep2Response> = await makePostRequest(
    endpoint,
    "triples/step2",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep3(
  endpoint: string,
  payload: TriplesStep3Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep3Response> = await makePostRequest(
    endpoint,
    "triples/step3",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep4(
  endpoint: string,
  payload: TriplesStep4Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep4Response> = await makePostRequest(
    endpoint,
    "triples/step4",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep5(
  endpoint: string,
  payload: TriplesStep5Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep5Response> = await makePostRequest(
    endpoint,
    "triples/step5",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep6(
  endpoint: string,
  payload: TriplesStep6Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep6Response> = await makePostRequest(
    endpoint,
    "triples/step6",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep7(
  endpoint: string,
  payload: TriplesStep7Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep7Response> = await makePostRequest(
    endpoint,
    "triples/step7",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep8(
  endpoint: string,
  payload: TriplesStep8Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep8Response> = await makePostRequest(
    endpoint,
    "triples/step8",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep9(
  endpoint: string,
  payload: TriplesStep9Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep9Response> = await makePostRequest(
    endpoint,
    "triples/step9",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep10(
  endpoint: string,
  payload: TriplesStep10Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep10Response> = await makePostRequest(
    endpoint,
    "triples/step10",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqTriplesStep11(
  endpoint: string,
  payload: TriplesStep11Body,
  authToken: string,
) {
  const resp: OkoApiResponse<TriplesStep11Response> = await makePostRequest(
    endpoint,
    "triples/step11",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqPresignStep1(
  endpoint: string,
  payload: PresignStep1Body,
  authToken: string,
) {
  const resp: OkoApiResponse<PresignStep1Response> = await makePostRequest(
    endpoint,
    "presign/step1",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqPresignStep2(
  endpoint: string,
  payload: PresignStep2Body,
  authToken: string,
) {
  const resp: OkoApiResponse<PresignStep2Response> = await makePostRequest(
    endpoint,
    "presign/step2",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqPresignStep3(
  endpoint: string,
  payload: PresignStep3Body,
  authToken: string,
) {
  const resp: OkoApiResponse<PresignStep3Response> = await makePostRequest(
    endpoint,
    "presign/step3",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqSignStep1(
  endpoint: string,
  payload: SignStep1Body,
  authToken: string,
) {
  const resp: OkoApiResponse<SignStep1Response> = await makePostRequest(
    endpoint,
    "sign/step1",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

export async function reqSignStep2(
  endpoint: string,
  payload: SignStep2Body,
  authToken: string,
) {
  const resp: OkoApiResponse<SignStep2Response> = await makePostRequest(
    endpoint,
    "sign/step2",
    payload,
    undefined,
    authToken,
  );
  return resp;
}

// legacy keygen api
export async function reqKeygenStep1(
  endpoint: string,
  payload: KeygenStep1V2Request,
) {
  const resp: KeygenStep1Response = await makePostRequest(
    endpoint,
    "keygen_step_1",
    payload,
  );
  return resp;
}

export async function reqKeygenStep2(
  endpoint: string,
  payload: KeygenStep2V2Request,
) {
  const resp: KeygenStep2Response = await makePostRequest(
    endpoint,
    "keygen_step_2",
    payload,
  );
  return resp;
}

export async function reqKeygenStep3(
  endpoint: string,
  payload: KeygenStep3V2Request,
) {
  const resp: KeygenStep3Response = await makePostRequest(
    endpoint,
    "keygen_step_3",
    payload,
  );
  return resp;
}

export async function reqKeygenStep4(
  endpoint: string,
  payload: KeygenStep4V2Request,
) {
  const resp: KeygenStep4Response = await makePostRequest(
    endpoint,
    "keygen_step_4",
    payload,
  );
  return resp;
}

export async function reqKeygenStep5(
  endpoint: string,
  payload: KeygenStep5V2Request,
) {
  const resp: KeygenStep5Response = await makePostRequest(
    endpoint,
    "keygen_step_5",
    payload,
  );
  return resp;
}

export async function reqAbortTssSession(
  endpoint: string,
  payload: AbortTssSessionBody,
  authToken: string,
) {
  const resp: OkoApiResponse<AbortTssSessionResponse> = await makePostRequest(
    endpoint,
    "session/abort",
    payload,
    undefined,
    authToken,
  );
  return resp;
}
