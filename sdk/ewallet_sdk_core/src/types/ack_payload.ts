export type AckSuccessPayload<T> = { success: true; data: T };
export type AckErrorPayload = { success: false; error: string };
export type AckPayload<T> = AckSuccessPayload<T> | AckErrorPayload;
