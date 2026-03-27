import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import type {
  OkoWalletMsgInit,
  OkoWalletTheme,
} from "@oko-wallet/oko-sdk-core";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { UTM_CAMPAIGN, UTM_SOURCE } from "@oko-wallet/oko-types/referral";
// import { useSearchParams } from "next/navigation";
import type { SignInSilentlyResponse } from "@oko-wallet/oko-types/user";
import { useEffect, useState } from "react";

import { determineTheme, setColorScheme } from "./color_scheme";
import { setUserId } from "@oko-wallet-attached/analytics/amplitude";
import {
  errorToLog,
  initErrorLogging,
} from "@oko-wallet-attached/logging/error";
import { postLog } from "@oko-wallet-attached/requests/logging";
import {
  makeAuthorizedOkoApiRequest,
  TSS_V2_ENDPOINT,
} from "@oko-wallet-attached/requests/oko_api";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { initKeplrWasm } from "@oko-wallet-attached/wasm";
import { makeMsgHandler } from "@oko-wallet-attached/window_msgs";
import { handleOAuthInfoPassV2 } from "@oko-wallet-attached/window_msgs/oauth_info_pass";
import { sendMsgToWindow } from "@oko-wallet-attached/window_msgs/send";
import { OAUTH_BROADCAST_CHANNEL } from "@oko-wallet-attached/window_msgs/target";
import type { MsgEventContext } from "@oko-wallet-attached/window_msgs/types";

export function useInitializeApp() {
  const {
    setHostOrigin,
    setAppName,
    setStorageKey,
    setIsMobileNative,
    setApiKey,
    setReferralInfo,
  } = useMemoryState();
  const { getAuthToken, getWallet, setAuthToken, resetAll, setTheme } =
    useAppState();
  const [isHydrated, setIsHydrated] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const unsubscribe = useAppState.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    if (useAppState.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    const msgHandler = makeMsgHandler();

    console.debug("[attached] adding msg event listener");
    window.addEventListener("message", msgHandler);

    // BroadcastChannel fallback for Safari (iOS) where popup's window.opener
    // is null after cross-origin OAuth navigation. The callback popup sends
    // oauth_info_pass via BroadcastChannel instead of window.opener.frames[].
    const bc = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);
    bc.onmessage = async (event) => {
      const message = event.data;

      if (
        message?.target === "oko_attached" &&
        message?.msg_type === "oauth_info_pass"
      ) {
        const port: Pick<MessagePort, "postMessage"> = {
          postMessage: (msg: unknown) => bc.postMessage(msg),
        };

        const targetOrigin = message.payload.target_origin;
        const storageKey = useMemoryState.getState().storageKey;
        if (!storageKey) {
          console.warn(
            "[attached] storageKey not initialized, ignoring BroadcastChannel oauth_info_pass",
          );
          return;
        }
        const ctx: MsgEventContext = {
          port: port as MessagePort,
          hostOrigin: targetOrigin,
          appName: targetOrigin.replace(/^https?:\/\//, ""),
          storageKey,
        };

        await handleOAuthInfoPassV2(ctx, message);
      }
    };

    return () => {
      window.removeEventListener("message", msgHandler);
      bc.close();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      console.log("[attached] not hydrated, waiting for hydration");
      return;
    }

    async function fn() {
      try {
        initErrorLogging();

        await initKeplrWasm();

        const searchParams = new URLSearchParams(window.location.search);

        const hostOrigin = searchParams.get("host_origin");
        const utmSource = searchParams.get(UTM_SOURCE);
        const utmCampaign = searchParams.get(UTM_CAMPAIGN);

        const isPopupContext = window.parent === window && !!window.opener;
        const canNotifyParent = window.parent !== window;

        if (hostOrigin === null) {
          if (canNotifyParent) {
            const msg: OkoWalletMsgInit = {
              target: "oko_sdk",
              msg_type: "init",
              payload: {
                success: false,
                err: "Host origin missing in searchParams",
              },
            };

            await sendMsgToWindow(window.parent, msg, "*");
          }

          console.error("[attached] host origin missing in search params");
          return;
        }

        setHostOrigin(hostOrigin);

        const isMobileNative = searchParams.get("mobile_native") === "true";
        const apiKey = searchParams.get("api_key");
        const clientRandom = searchParams.get("client_random");

        if (isMobileNative && (!clientRandom || clientRandom.length < 16)) {
          const errMsg = "mobile_native requires client_random (>= 16 chars)";
          console.error("[attached]", errMsg);
          if (canNotifyParent) {
            const msg: OkoWalletMsgInit = {
              target: "oko_sdk",
              msg_type: "init",
              payload: { success: false, err: errMsg },
            };
            await sendMsgToWindow(window.parent, msg, "*");
          }
          return;
        }

        const storageKey =
          isMobileNative && clientRandom
            ? `oko-mobile://${clientRandom}`
            : hostOrigin;
        setStorageKey(storageKey);

        if (isMobileNative && apiKey) {
          setAppName(apiKey.slice(0, 10));
          resolveAppNameAsync(apiKey, setAppName);
        } else {
          setAppName(hostOrigin.replace(/^https?:\/\//, ""));
        }

        setIsMobileNative(isMobileNative);
        if (apiKey) {
          setApiKey(apiKey);
        }

        setReferralInfo({
          origin: hostOrigin,
          utmSource,
          utmCampaign,
        });

        const authToken = getAuthToken(storageKey);
        const walletForAuth = getWallet(storageKey);
        const wasInvalidated = await silentlyRefreshAuthToken(
          authToken,
          storageKey,
          setAuthToken,
          walletForAuth?.authType,
        );

        if (wasInvalidated) {
          resetAll(storageKey);
        }

        const rawTheme = searchParams.get("theme");
        const sdkThemeParam: OkoWalletTheme | null =
          rawTheme === "light" || rawTheme === "dark" ? rawTheme : null;

        const themeResult = determineTheme(sdkThemeParam);
        const determinedTheme = themeResult.theme;

        // Mobile: watch for system theme settling
        // (Chrome Custom Tab may report "light" initially then switch to "dark")
        if (isMobileNative && themeResult.usesSystemPreference) {
          const mq = window.matchMedia("(prefers-color-scheme: dark)");
          mq.addEventListener("change", () => {
            const t: Theme = mq.matches ? "dark" : "light";
            setTheme(storageKey, t);
            setColorScheme(t);
            setResolvedTheme(t);
          });
        }

        setTheme(storageKey, determinedTheme);
        setColorScheme(determinedTheme);

        setResolvedTheme(determinedTheme);

        const wallet = getWallet(storageKey);
        const authType = wallet?.authType;
        const email = wallet?.email;
        const publicKey = wallet?.publicKey;
        const name = wallet?.name;

        if (wallet?.walletId) {
          setUserId(wallet.walletId);
        }

        const initMsg: OkoWalletMsgInit = {
          target: "oko_sdk",
          msg_type: "init",
          payload: {
            success: true,
            data: {
              auth_type: authType ?? null,
              email: email ?? null,
              public_key: publicKey ?? null,
              name: name ?? null,
            },
          },
        };

        if (canNotifyParent) {
          await sendInitMsg(hostOrigin, initMsg);
          console.log("[attached] init success, wallet: %s", wallet?.email);
        } else if (isPopupContext) {
          console.log(
            "[attached] popup context initialized for %s",
            hostOrigin,
          );
        }
      } catch (err: any) {
        postLog(
          {
            level: "error",
            message: "[attached] error initializing app",
            error: errorToLog(err),
          },
          { console: true },
        );

        if (window.parent !== window) {
          const initErrorMsg: OkoWalletMsgInit = {
            target: "oko_sdk",
            msg_type: "init",
            payload: {
              success: false,
              err: err.message,
            },
          };
          sendInitMsg("*", initErrorMsg);
        }
      }
    }

    fn().then();
  }, [getAuthToken, setAuthToken, isHydrated]);

  return { theme: resolvedTheme };
}

function sendInitMsg(hostOrigin: string, msg: OkoWalletMsgInit) {
  if (window.parent === window) {
    console.warn("[attached] no parent window to send init msg");
    return Promise.resolve(msg);
  }

  console.log(`[attached] sending init msg, payload: %o`, msg.payload);

  return sendMsgToWindow(window.parent, msg, hostOrigin);
}

async function resolveAppNameAsync(
  _apiKey: string,
  _setAppName: (name: string) => void,
) {
  // TODO: fetch app name from backend by apiKey
}

async function silentlyRefreshAuthToken(
  authToken: string | null,
  storageKey: string,
  setAuthToken: (storageKey: string, token: string | null) => void,
  authType?: AuthType,
): Promise<boolean> {
  if (!authToken) {
    return false;
  }

  const res = await makeAuthorizedOkoApiRequest<any, SignInSilentlyResponse>(
    "user/signin_silently",
    authToken,
    {
      auth_type: authType,
    },
    TSS_V2_ENDPOINT,
  );

  if (!res.success) {
    console.error("Error logging in, err: %s", res.err);

    // Token rejected (e.g. expired beyond renewal window) — clear it
    // so the init message reports unauthenticated state and the host
    // app can prompt re-authentication.
    if (res.err.type === "status_fail" && res.err.status === 401) {
      setAuthToken(storageKey, null);
      return true;
    }

    // Non-401 failures (network error, server error, etc.): keep the
    // token. The server may still accept it for renewal on the next
    // attempt (tokens past exp can be renewed within the 7-day window).
    return false;
  }

  const resp = res.data;
  if (resp.success) {
    if (resp.data.token !== null) {
      console.log("[attached] refreshing auth token");

      setAuthToken(storageKey, resp.data.token);
    }
    return false;
  }

  // Server returned 200 but application-level failure (e.g. UNKNOWN_ERROR).
  // Keep the token — the server may still renew it on the next attempt.
  console.error("[attached] silent sign-in app error, code: %s", resp.code);
  return false;
}
