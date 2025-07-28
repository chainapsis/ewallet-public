export type EwalletApiResponse<T> =
  | EwalletApiSuccessResponse<T>
  | EwalletApiErrorResponse;

export interface EwalletApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface EwalletApiErrorResponse {
  success: false;
  code: string;
  msg: string;
}

export type ErrorCode =
  | "WALLET_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "DUPLICATE_PUBLIC_KEY"
  | "INVALID_TSS_SESSION"
  | "INVALID_TSS_STAGE"
  | "INVALID_TSS_TRIPLES_RESULT"
  | "INVALID_TSS_PRESIGN_RESULT"
  | "INVALID_TSS_SIGN_RESULT"
  | "CUSTOMER_ACCOUNT_NOT_FOUND"
  | "INVALID_EMAIL_OR_PASSWORD"
  | "EMAIL_NOT_VERIFIED"
  | "EMAIL_ALREADY_VERIFIED"
  | "VERIFICATION_CODE_ALREADY_SENT"
  | "FAILED_TO_SEND_EMAIL"
  | "INVALID_VERIFICATION_CODE"
  | "FAILED_TO_GENERATE_TOKEN"
  | "ORIGINAL_PASSWORD_INCORRECT"
  | "FAILED_TO_UPDATE_PASSWORD"
  | "AUTHENTICATION_FAILED"
  | "CUSTOMER_NOT_FOUND"
  | "DUPLICATE_EMAIL"
  | "UNAUTHORIZED"
  | "UNKNOWN_ERROR";

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
}
