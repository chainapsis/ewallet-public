import { useState, useEffect } from "react";
// import { useSearchParams } from "next/navigation";
import type { SignInSilentlyResponse } from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OkoWalletMsgInit } from "@oko-wallet/oko-sdk-core";
import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import { UTM_SOURCE, UTM_CAMPAIGN } from "@oko-wallet/oko-types/referral";

import { initKeplrWasm } from "@oko-wallet-attached/wasm";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { useAppState } from "@oko-wallet-attached/store/app";
import {
  makeAuthorizedOkoApiRequest,
  TSS_V2_ENDPOINT,
} from "@oko-wallet-attached/requests/oko_api";
import { determineTheme, setColorScheme } from "./color_scheme";
import { makeMsgHandler } from "@oko-wallet-attached/window_msgs";
import {
  errorToLog,
  initErrorLogging,
} from "@oko-wallet-attached/logging/error";
import { postLog } from "@oko-wallet-attached/requests/logging";
import { sendMsgToWindow } from "@oko-wallet-attached/window_msgs/send";
import { setUserId } from "@oko-wallet-attached/analytics/amplitude";

export function useInitializeApp() {
  const { setHostOrigin, setReferralInfo } = useMemoryState();
  const { getAuthToken, getWallet, setAuthToken, setTheme, getTheme } =
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

    return () => {
      window.removeEventListener("message", msgHandler);
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
        await silentlyRefreshAuthToken(
          authToken,
          hostOrigin,
          setAuthToken,
          walletForAuth?.authType,
        );

        const oldTheme = getTheme(hostOrigin);
        const determinedThemeByCustomer = await determineTheme(
          hostOrigin,
          oldTheme,
        );

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
) {
  if (authToken) {
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
      return;
    }

    const resp = res.data;
    if (resp.success) {
      if (resp.data.token !== null) {
        console.log("[attached] refreshing auth token");

        setAuthToken(hostOrigin, resp.data.token);
      }
    }
  }
}
