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
  const { setHostOrigin, setReferralInfo } = useMemoryState();
  const {
    getAuthToken,
    getWallet,
    setAuthToken,
    resetAll,
    setTheme,
    getTheme,
  } = useAppState();
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

        const ctx: MsgEventContext = {
          port: port as MessagePort,
          hostOrigin: message.payload.target_origin,
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

        setReferralInfo({
          origin: hostOrigin,
          utmSource,
          utmCampaign,
        });

        const authToken = getAuthToken(hostOrigin);
        const walletForAuth = getWallet(hostOrigin);
        const wasInvalidated = await silentlyRefreshAuthToken(
          authToken,
          hostOrigin,
          setAuthToken,
          walletForAuth?.authType,
        );

        if (wasInvalidated) {
          resetAll(hostOrigin);
        }

        const rawTheme = searchParams.get("theme");
        const sdkThemeParam: OkoWalletTheme | null =
          rawTheme === "light" || rawTheme === "dark" ? rawTheme : null;

        const oldTheme = getTheme(hostOrigin);
        const themeResult = await determineTheme(
          hostOrigin,
          oldTheme,
          sdkThemeParam,
        );
        const determinedThemeByCustomer = themeResult.theme;

        const isMobileParam = searchParams.get("mobile") === "true";

        // Mobile: watch for system theme settling
        // (Chrome Custom Tab may report "light" initially then switch to "dark")
        if (isMobileParam && themeResult.usesSystemPreference) {
          const mq = window.matchMedia("(prefers-color-scheme: dark)");
          mq.addEventListener("change", () => {
            const t: typeof determinedThemeByCustomer = mq.matches
              ? "dark"
              : "light";
            setColorScheme(t);
            setTheme(hostOrigin, t);
            setResolvedTheme(t);
          });
        }

        setTheme(hostOrigin, determinedThemeByCustomer);
        setColorScheme(determinedThemeByCustomer);

        setResolvedTheme(determinedThemeByCustomer);

        const wallet = getWallet(hostOrigin);
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

async function silentlyRefreshAuthToken(
  authToken: string | null,
  hostOrigin: string,
  setAuthToken: (hostOrigin: string, token: string | null) => void,
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
      setAuthToken(hostOrigin, null);
      return true;
    }

    return false;
  }

  const resp = res.data;
  if (resp.success) {
    if (resp.data.token !== null) {
      console.log("[attached] refreshing auth token");

      setAuthToken(hostOrigin, resp.data.token);
    }
  }

  return false;
}
