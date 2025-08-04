export type ErrorCode =
  | "UNKNOWN_ERROR"
  | "DUPLICATE_PUBLIC_KEY"
  | "USER_NOT_FOUND"
  | "WALLET_NOT_FOUND"
  | "UNAUTHORIZED"
  | "KEY_SHARE_NOT_FOUND"
  | "ID_TOKEN_INVALID"
  | "ID_TOKEN_MISMATCHED"
  | "PUBLIC_KEY_INVALID";

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
}
