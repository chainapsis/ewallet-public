import type { AuthType } from "@oko-wallet/oko-types/auth";

export interface OAuthBody {
  auth_type: AuthType;
}

export interface OAuthUser {
  type: AuthType;
  user_identifier: string;
  // google, auth0, discord
  email?: string;
  // x, telegram, discord
  name?: string;
  // raw metadata from auth provider
  metadata?: Record<string, unknown>;
}

export interface OAuthLocals {
  oauth_user: OAuthUser;
}
