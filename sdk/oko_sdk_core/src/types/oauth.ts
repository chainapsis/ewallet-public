import type { AuthType } from "@oko-wallet/oko-types/auth";

export type SignInType =
  | "google"
  | "email"
  | "x"
  | "telegram"
  | "discord"
  | "github";

export type OAuthState = {
  apiKey: string;
  targetOrigin: string;
  provider: AuthType;
  modalId?: string;
  codeVerifier?: string;
  /** Deep link scheme for React Native OAuth callback (e.g. "okowallet") */
  redirectScheme?: string;
};

export enum RedirectUriSearchParamsKey {
  STATE = "state",
}

export interface OAuthPayload {
  access_token: string;
  id_token: string;
  api_key: string;
  target_origin: string;
  auth_type: AuthType;
}
export type OAuthTokenRequestPayload =
  | OAuthTokenRequestPayloadOfX
  | OAuthTokenRequestPayloadOfTelegram
  | OAuthTokenRequestPayloadOfDiscord
  | OAuthTokenRequestPayloadOfGithub;

export interface OAuthTokenRequestPayloadOfX {
  code: string;
  api_key: string;
  target_origin: string;
  auth_type: "x";
}

export interface OAuthTokenRequestPayloadOfDiscord {
  code: string;
  api_key: string;
  target_origin: string;
  auth_type: "discord";
}

export interface OAuthTokenRequestPayloadOfTelegram {
  telegram_data: Record<string, string>;
  api_key: string;
  target_origin: string;
  auth_type: "telegram";
}

export interface OAuthTokenRequestPayloadOfGithub {
  code: string;
  api_key: string;
  target_origin: string;
  auth_type: "github";
}
