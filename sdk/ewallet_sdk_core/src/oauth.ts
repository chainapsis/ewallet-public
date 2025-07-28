export const RedirectUriSearchParamsKey = {
  STATE: "state",
};

export type OAuthState = {
  customerId: string;
  targetOrigin: string;
};
