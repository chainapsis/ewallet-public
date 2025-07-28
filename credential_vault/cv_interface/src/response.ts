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
