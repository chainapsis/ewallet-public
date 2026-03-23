import type { OkoCoreAction, OkoCoreState } from "./types";

export const initialCoreState: OkoCoreState = {
  wallet: null,
  isInitialized: false,
  isReady: false,
  error: null,
  authType: null,
  email: null,
  publicKey: null,
  name: null,
};

export function coreReducer(
  state: OkoCoreState,
  action: OkoCoreAction,
): OkoCoreState {
  switch (action.type) {
    case "INIT_SUCCESS":
      return {
        ...state,
        wallet: action.wallet,
        isInitialized: true,
        error: null,
      };

    case "INIT_ERROR":
      return {
        ...state,
        isInitialized: false,
        error: action.error,
      };

    case "READY":
      return {
        ...state,
        isReady: true,
        authType: action.state.authType,
        email: action.state.email,
        publicKey: action.state.publicKey,
        name: action.state.name,
      };

    case "ACCOUNTS_CHANGED":
      return {
        ...state,
        authType: action.authType,
        email: action.email,
        publicKey: action.publicKey,
        name: action.name,
      };

    case "SIGNED_OUT":
      return {
        ...state,
        authType: null,
        email: null,
        publicKey: null,
        name: null,
      };

    default:
      return state;
  }
}
