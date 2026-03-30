export type SocialLoginXBody = {
  code: string;
  code_verifier: string;
  redirect_uri: string;
};

export type SocialLoginXResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export type SocialLoginXVerifyUserResponse = {
  id: string;
  name: string;
  username: string;
  email?: string;
};

export type SocialLoginGithubBody = {
  code: string;
  code_verifier: string;
  redirect_uri: string;
};

export type SocialLoginGithubResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export type SocialLoginGithubVerifyUserResponse = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
};

export type SocialLoginTelegramBody = {
  code: string;
  code_verifier: string;
  redirect_uri: string;
};

export type SocialLoginTelegramResponse = {
  id_token: string;
};
