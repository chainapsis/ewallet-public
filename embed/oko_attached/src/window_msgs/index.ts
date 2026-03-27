import type {
  OkoWalletMsg,
  OkoWalletMsgExportPrivateKey,
  OkoWalletMsgGetConnectedApps,
} from "@oko-wallet/oko-sdk-core";

import { handleExportPrivateKey } from "./export_private_key";
import { handleGenerateOAuthUrl } from "./generate_oauth_url";
import { handleGetAuthType } from "./get_auth_type";
import { handleGetConnectedApps } from "./get_connected_apps";
import { handleGetCosmosChain } from "./get_cosmos_chain_info";
import { handleGetEmail } from "./get_email";
import { handleGetEthChain } from "./get_eth_chain_info";
import { handleGetName } from "./get_name";
import { handleGetPublicKey } from "./get_public_key";
import { handleGetPublicKeyEd25519 } from "./get_public_key_ed25519";
import { handleGetWalletInfo } from "./get_wallet_info";
import { handleOAuthInfoPassV2 } from "./oauth_info_pass";
import { handleOpenModal } from "./open_modal";
import { handleSetCodeVerifier } from "./set_code_verifier";
import { handleSetOAuthNonce } from "./set_oauth_nonce";
import { handleSignOut } from "./sign_out";
import { OKO_SDK_TARGET } from "./target";
import type { MsgEventContext } from "./types";
import { setColorScheme } from "@oko-wallet-attached/components/attached_initialized/color_scheme";
import { MOBILE_NATIVE_ORIGIN } from "@oko-wallet-attached/requests/endpoints";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

// NOTE: Some types are used only within certain apps, such as "user_dashboard"
type ExtendedOkoWalletMsg =
  | OkoWalletMsg
  | OkoWalletMsgGetConnectedApps
  | OkoWalletMsgExportPrivateKey;

export function makeMsgHandler() {
  return async function msgHandler(event: MessageEvent) {
    // Handle port-less messages (popup → iframe, fire-and-forget)
    const data = event.data;
    if (
      data?.target === "oko_attached" &&
      data?.msg_type === "set_reauth_params"
    ) {
      // set_reauth_params is sent from the re-auth popup (same attached origin)
      // or from the host parent window (cross-origin iframe, e.g. mobile mobile host web)
      const registeredHostOrigin = useMemoryState.getState().hostOrigin;
      if (
        event.origin !== window.location.origin &&
        event.origin !== registeredHostOrigin
      ) {
        console.warn(
          "[attached] set_reauth_params rejected from origin:",
          event.origin,
        );
        return;
      }
      const appState = useAppState.getState();
      // Use registeredHostOrigin as storage key when sent from the parent window,
      // so that the nonce is found by oauth_info_pass (which looks up by hostOrigin).
      const storageOrigin = useMemoryState.getState().storageKey;
      if (!storageOrigin) {
        console.warn(
          "[attached] storageKey not initialized, ignoring set_reauth_params",
        );
        return;
      }
      const payload = data.payload as
        | { nonce?: string; code_verifier?: string }
        | undefined;
      if (payload?.nonce) {
        appState.setNonce(storageOrigin, payload.nonce);
      }
      if (payload?.code_verifier) {
        appState.setCodeVerifier(storageOrigin, payload.code_verifier);
      }
      console.debug("[attached] set_reauth_params received", event.origin);
      return;
    }

    // set_theme: portless fire-and-forget from SDK host
    if (data?.target === "oko_attached" && data?.msg_type === "set_theme") {
      const registeredHostOrigin = useMemoryState.getState().hostOrigin;
      if (event.origin !== registeredHostOrigin) {
        console.warn(
          "[attached] set_theme rejected from origin:",
          event.origin,
        );
        return;
      }
      const theme = data.payload?.theme as "light" | "dark" | undefined;
      if (theme === "light" || theme === "dark") {
        setColorScheme(theme);
        useMemoryState.getState().setResolvedTheme(theme);
        const hostOrigin = useMemoryState.getState().hostOrigin;
        if (hostOrigin) {
          useAppState.getState().setTheme(hostOrigin, theme);
        }
        console.debug("[attached] set_theme applied:", theme);
      }
      return;
    }

    if (event.ports.length < 1) {
      // do nothing

      return;
    }

    const port = event.ports[0];

    const message = event.data as ExtendedOkoWalletMsg;

    if (message.target === "oko_attached" || message.target === "oko_sdk") {
      console.debug("[attached] msg recv", event.data);
    } else {
      // do nothing
      return;
    }

    const memState = useMemoryState.getState();
    // When the message comes from attached_mobile_host_web (mobile native host),
    // keep the appName set during initialization (e.g. apiKey-derived name).
    const isFromProxy =
      MOBILE_NATIVE_ORIGIN && event.origin === MOBILE_NATIVE_ORIGIN;
    const appName =
      isFromProxy && memState.appName
        ? memState.appName
        : event.origin.replace(/^https?:\/\//, "");
    if (!isFromProxy) {
      memState.setAppName(appName);
    }
    // open_modal does not require storageKey — it only stores the modal
    // request in MemoryState.  Handle it before the storageKey guard so
    // that popup windows (where init is still in progress when the SDK
    // sends open_modal right after popup_ready) are not rejected.
    if (message.msg_type === "open_modal") {
      handleOpenModal(
        { port, hostOrigin: event.origin, appName, storageKey: "" },
        message,
      );
      return;
    }

    const storageKey = memState.storageKey;
    if (!storageKey) {
      console.warn(
        "[attached] storageKey not initialized, rejecting message:",
        message.msg_type,
      );
      port.postMessage({
        target: OKO_SDK_TARGET,
        msg_type: `${message.msg_type}_ack`,
        payload: {
          success: false,
          err: "wallet not initialized",
        },
      });
      return;
    }

    const ctx: MsgEventContext = {
      port,
      hostOrigin: event.origin,
      appName,
      storageKey,
    };

    switch (message.msg_type) {
      case "set_oauth_nonce": {
        handleSetOAuthNonce(ctx, message);
        break;
      }

      case "set_code_verifier": {
        handleSetCodeVerifier(ctx, message);
        break;
      }

      // case "oauth_sign_in":
      //   await handleOAuthSignIn(ctx, message);
      //   break;

      case "get_public_key": {
        await handleGetPublicKey(ctx);
        break;
      }

      case "get_public_key_ed25519": {
        await handleGetPublicKeyEd25519(ctx);
        break;
      }

      case "get_email": {
        await handleGetEmail(ctx);
        break;
      }

      case "get_name": {
        await handleGetName(ctx);
        break;
      }

      case "get_wallet_info": {
        await handleGetWalletInfo(ctx);
        break;
      }

      case "get_auth_type": {
        await handleGetAuthType(ctx);
        break;
      }

      case "sign_out": {
        await handleSignOut(ctx);
        break;
      }

      case "get_cosmos_chain_info": {
        await handleGetCosmosChain(ctx, message);
        break;
      }

      case "get_eth_chain_info": {
        await handleGetEthChain(ctx, message);
        break;
      }

      case "generate_oauth_url": {
        await handleGenerateOAuthUrl(ctx, message);
        break;
      }

      // @NOTE: Switch to handleOAuthInfoPassV2 for ed25519 support
      case "oauth_info_pass": {
        await handleOAuthInfoPassV2(ctx, message);
        break;
      }

      case "__get_connected_apps__": {
        await handleGetConnectedApps(ctx);
        break;
      }

      case "__export_private_key__": {
        await handleExportPrivateKey(ctx, message.payload);
        break;
      }

      default:
        console.error(
          `[attached] unimplemented, msg_type: ${message.msg_type}`,
        );

        port.postMessage({
          target: OKO_SDK_TARGET,
          msg_type: "unknown_msg_type",
          payload: `unsupported msg_type: ${message.msg_type}`,
        });
        return;
    }
  };
}
