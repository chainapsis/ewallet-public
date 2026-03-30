import type { AuthType } from "@oko-wallet/oko-types/auth";

import type { OkoWalletTheme } from "./oko_wallet";

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
  redirectScheme?: string | null;
  modalId?: string;
  codeVerifier?: string;
  theme?: OkoWalletTheme;
  /** When true, callback pages redirect to /mobile/login/complete instead of deep-linking.
   *  Used by the OS-browser login flow where keygen runs inside the browser. */
  mobileOsBrowser?: boolean;
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
  code: string;
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
