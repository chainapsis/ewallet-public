import type {
  OAuthPayload,
  OAuthSignInError,
  OAuthTokenRequestPayload,
  OAuthTokenRequestPayloadOfDiscord,
  OAuthTokenRequestPayloadOfGithub,
  OAuthTokenRequestPayloadOfTelegram,
  OAuthTokenRequestPayloadOfX,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import { getAccessTokenOfDiscordWithPKCE } from "./discord";
import { getAccessTokenOfGithub } from "./github";
import { getIdTokenOfTelegram } from "./telegram";
import { verifyIdToken } from "./token";
import { getAccessTokenOfX } from "./x";
import { useAppState } from "@oko-wallet-attached/store/app";

type OAuthCredentialResult = Result<
  { idToken: string; userIdentifier: string },
  OAuthSignInError
>;

async function validateOAuthPayloadOfX(
  payload: OAuthTokenRequestPayloadOfX,
  storageKey: string,
): Promise<OAuthCredentialResult> {
  const appState = useAppState.getState();

  const codeVerifierRegistered = appState.getCodeVerifier(storageKey);
  if (!codeVerifierRegistered) {
    return {
      success: false,
      err: {
        type: "PKCE_missing",
      },
    };
  }

  const redirectOrigin =
    appState.getOauthRedirectOrigin(storageKey) ?? window.location.origin;
  const redirectUri = `${redirectOrigin}/x/callback`;

  const tokenRes = await getAccessTokenOfX(
    payload.code,
    codeVerifierRegistered,
    redirectUri,
  );

  if (!tokenRes.success) {
    return {
      success: false,
      err: {
        type: "unknown",
        error: tokenRes.err,
      },
    };
  }

  const verifyIdTokenRes = await verifyIdToken("x", tokenRes.data);
  if (!verifyIdTokenRes.success) {
    return {
      success: false,
      err: {
        type: "unknown",
        error: verifyIdTokenRes.err,
      },
    };
  }

  const userInfo = verifyIdTokenRes.data;
  const tokenInfo = tokenRes.data;

  appState.setCodeVerifier(storageKey, null);
  appState.setOauthRedirectOrigin(storageKey, null);

  return {
    success: true,
    data: {
      idToken: tokenInfo,
      userIdentifier: userInfo.user_identifier,
    },
  };
}

async function validateOAuthPayloadOfTelegram(
  payload: OAuthTokenRequestPayloadOfTelegram,
  storageKey: string,
): Promise<OAuthCredentialResult> {
  const appState = useAppState.getState();
  const codeVerifierRegistered = appState.getCodeVerifier(storageKey);
  if (!codeVerifierRegistered) {
    return {
      success: false,
      err: { type: "PKCE_missing" },
    };
  }

  const redirectOrigin =
    appState.getOauthRedirectOrigin(storageKey) ?? window.location.origin;
  const redirectUri = `${redirectOrigin}/telegram/callback`;

  const tokenRes = await getIdTokenOfTelegram(
    payload.code,
    codeVerifierRegistered,
    redirectUri,
  );

  if (!tokenRes.success) {
    return {
      success: false,
      err: { type: "unknown", error: tokenRes.err },
    };
  }

  const verifyIdTokenRes = await verifyIdToken("telegram", tokenRes.data);
  if (!verifyIdTokenRes.success) {
    return {
      success: false,
      err: { type: "unknown", error: verifyIdTokenRes.err },
    };
  }

  const userInfo = verifyIdTokenRes.data;

  appState.setCodeVerifier(storageKey, null);
  appState.setOauthRedirectOrigin(storageKey, null);

  return {
    success: true,
    data: {
      idToken: tokenRes.data,
      userIdentifier: userInfo.user_identifier,
    },
  };
}

async function validateOAuthPayloadOfDiscord(
  payload: OAuthTokenRequestPayloadOfDiscord,
  storageKey: string,
): Promise<OAuthCredentialResult> {
  const appState = useAppState.getState();
  const codeVerifierRegistered = appState.getCodeVerifier(storageKey);
  if (!codeVerifierRegistered) {
    return {
      success: false,
      err: { type: "PKCE_missing" },
    };
  }

  const redirectOrigin =
    appState.getOauthRedirectOrigin(storageKey) ?? window.location.origin;
  const redirectUri = `${redirectOrigin}/discord/callback`;

  const tokenRes = await getAccessTokenOfDiscordWithPKCE(
    payload.code,
    codeVerifierRegistered,
    redirectUri,
  );

  if (!tokenRes.success) {
    return {
      success: false,
      err: { type: "unknown", error: tokenRes.err },
    };
  }

  const verifyIdTokenRes = await verifyIdToken("discord", tokenRes.data);
  if (!verifyIdTokenRes.success) {
    return {
      success: false,
      err: { type: "unknown", error: verifyIdTokenRes.err },
    };
  }

  const userInfo = verifyIdTokenRes.data;

  appState.setCodeVerifier(storageKey, null);
  appState.setOauthRedirectOrigin(storageKey, null);

  return {
    success: true,
    data: {
      idToken: tokenRes.data,
      userIdentifier: userInfo.user_identifier,
    },
  };
}

async function validateOAuthPayloadOfGithub(
  payload: OAuthTokenRequestPayloadOfGithub,
  storageKey: string,
): Promise<OAuthCredentialResult> {
  const appState = useAppState.getState();
  const codeVerifierRegistered = appState.getCodeVerifier(storageKey);
  if (!codeVerifierRegistered) {
    return {
      success: false,
      err: { type: "PKCE_missing" },
    };
  }

  const redirectOrigin =
    appState.getOauthRedirectOrigin(storageKey) ?? window.location.origin;
  const redirectUri = `${redirectOrigin}/github/callback`;

  const tokenRes = await getAccessTokenOfGithub(
    payload.code,
    codeVerifierRegistered,
    redirectUri,
  );

  if (!tokenRes.success) {
    return {
      success: false,
      err: { type: "unknown", error: tokenRes.err },
    };
  }

  const verifyIdTokenRes = await verifyIdToken("github", tokenRes.data);
  if (!verifyIdTokenRes.success) {
    return {
      success: false,
      err: { type: "unknown", error: verifyIdTokenRes.err },
    };
  }

  const userInfo = verifyIdTokenRes.data;

  appState.setCodeVerifier(storageKey, null);
  appState.setOauthRedirectOrigin(storageKey, null);

  return {
    success: true,
    data: {
      idToken: tokenRes.data,
      userIdentifier: userInfo.user_identifier,
    },
  };
}

async function validateOAuthPayload(
  payload: OAuthPayload,
  storageKey: string,
): Promise<OAuthCredentialResult> {
  const appState = useAppState.getState();
  const nonceRegistered = appState.getNonce(storageKey);

  if (!nonceRegistered) {
    return {
      success: false,
      err: { type: "nonce_missing" },
    };
  }

  const tokenInfoRes = await verifyIdToken(
    payload.auth_type,
    payload.id_token,
    nonceRegistered,
  );

  if (!tokenInfoRes.success) {
    return {
      success: false,
      err: { type: "vendor_token_verification_failed" },
    };
  }

  const tokenInfo = tokenInfoRes.data;
  return {
    success: true,
    data: {
      idToken: payload.id_token,
      userIdentifier: tokenInfo.user_identifier,
    },
  };
}

export async function getCredentialsFromPayload(
  payload: OAuthPayload | OAuthTokenRequestPayload,
  storageKey: string,
): Promise<OAuthCredentialResult> {
  if (isOAuthTokenRequestPayload(payload)) {
    switch (payload.auth_type) {
      case "x":
        return validateOAuthPayloadOfX(payload, storageKey);
      case "telegram":
        return validateOAuthPayloadOfTelegram(payload, storageKey);
      case "discord":
        return validateOAuthPayloadOfDiscord(payload, storageKey);
      case "github":
        return validateOAuthPayloadOfGithub(payload, storageKey);
    }
  } else {
    // payload is OAuthPayload
    switch (payload.auth_type) {
      case "google":
      case "auth0":
        return validateOAuthPayload(payload, storageKey);
      default:
        return {
          success: false,
          err: {
            type: "unknown",
            error: `Unsupported auth_type: ${payload.auth_type}`,
          },
        };
    }
  }
}

function isOAuthTokenRequestPayload(
  payload: OAuthPayload | OAuthTokenRequestPayload,
): payload is OAuthTokenRequestPayload {
  return (
    payload.auth_type === "x" ||
    payload.auth_type === "telegram" ||
    payload.auth_type === "discord" ||
    payload.auth_type === "github"
  );
}
