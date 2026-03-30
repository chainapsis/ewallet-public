export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CHANGED_PASSWORD_MIN_LENGTH = 8;
export const CHANGED_PASSWORD_MAX_LENGTH = 20;
export const PASSWORD_CONTAINS_NUMBER_REGEX = /\d/;

export const SIX_DIGITS_REGEX = /^\d{6}$/;

export const CAN_RESEND_CODE_INTERVAL_SECONDS = 60;

export const CUSTOMER_ISSUER = "https://api.oko.app";
export const CUSTOMER_AUDIENCE = "https://api.oko.app";

export const INVITATION_EXPIRY_DAYS = 7;
export const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
