export const TEMP_ENC_SECRET = "temp_enc_secret";

export const TEMP_COMMITTEE_ID = 1;

export type Result<T, E> = SuccessResult<T> | ErrorResult<E>;

export interface SuccessResult<T> {
  success: true;
  data: T;
}

export interface ErrorResult<E> {
  success: false;
  err: E;
}
