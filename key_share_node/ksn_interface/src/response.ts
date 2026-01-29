export type KSNodeApiResponse<T> =
  | KSNodeApiSuccessResponse<T>
  | KSNodeApiErrorResponse;

export interface KSNodeApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface KSNodeApiErrorResponse {
  success: false;
  code: KSNodeApiErrorCode;
  msg: string;
}

export type KSNodeApiErrorCode =
  | "UNKNOWN_ERROR"
  | "INVALID_REQUEST"
  | "DUPLICATE_PUBLIC_KEY"
  | "USER_NOT_FOUND"
  | "WALLET_NOT_FOUND"
  | "SHARE_INVALID"
  | "UNAUTHORIZED"
  | "KEY_SHARE_NOT_FOUND"
  | "PUBLIC_KEY_INVALID"
  | "PG_DUMP_FAILED"
  | "INVALID_DAYS"
  | "INVALID_DUMP_PATH"
  | "INVALID_DUMP_FILE"
  | "DUMP_FILE_ACCESS_ERROR"
  | "PG_RESTORE_FAILED"
  | "DUMP_FILE_NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "CURVE_TYPE_NOT_SUPPORTED"
  | "RESHARE_FAILED"
  | "SESSION_ALREADY_EXISTS"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "INVALID_SIGNATURE"
  | "API_ALREADY_CALLED";
