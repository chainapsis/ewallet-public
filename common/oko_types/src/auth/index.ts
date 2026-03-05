export type AuthType =
  | "google"
  | "auth0"
  | "x"
  | "telegram"
  | "discord"
  | "github";

export interface TokenResult {
  token: string;
}

export type OAuthRequest<T> = {
  auth_type: AuthType;
} & T;
