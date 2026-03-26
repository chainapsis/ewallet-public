export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CHANGED_PASSWORD_MIN_LENGTH = 8;

export const SIX_DIGITS_REGEX = /^\d{6}$/;

export const CAN_RESEND_CODE_INTERVAL_SECONDS = 60;

export const CUSTOMER_ISSUER = "https://api.oko.app";
export const CUSTOMER_AUDIENCE = "https://api.oko.app";

export const USER_ISSUER = "https://api.oko.app";
export const USER_AUDIENCE = "https://api.oko.app";
export const USER_TOKEN_EXPIRATION_WINDOW = 1 * 24 * 60 * 60 * 1000; // 1 day in ms
export const SILENT_SIGNIN_MAX_TOKEN_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
