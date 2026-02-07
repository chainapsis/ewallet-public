import type { OkoWalletMsg } from "@oko-wallet/oko-sdk-core";

import type { MsgEventContext } from "./types";
import { handleGetPublicKey } from "./get_public_key";
import { handleGetPublicKeyEd25519 } from "./get_public_key_ed25519";
import { handleSetOAuthNonce } from "./set_oauth_nonce";
import { handleSetCodeVerifier } from "./set_code_verifier";
import { handleOpenModal } from "./open_modal";
import { handleSignOut } from "./sign_out";
import { handleGetEmail } from "./get_email";
import { handleGetName } from "./get_name";
import { handleGetWalletInfo } from "./get_wallet_info";
import { handleGetAuthType } from "./get_auth_type";
import { handleGetCosmosChain } from "./get_cosmos_chain_info";
import { handleOAuthInfoPassV2 } from "./oauth_info_pass";
import { handleGetEthChain } from "./get_eth_chain_info";
import { handleGetConnectedApps } from "./get_connected_apps";

// NOTE: Since this method can only be used within user_dashboard,
// Define ExtendedOkoWalletMsg to extend the type
type OkoWalletMsgGetConnectedApps = {
  target: "oko_attached";
  msg_type: "__get_connected_apps__";
  payload: null;
};

type ExtendedOkoWalletMsg = OkoWalletMsg | OkoWalletMsgGetConnectedApps;

export function makeMsgHandler() {
  return async function msgHandler(event: MessageEvent) {
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

    const ctx: MsgEventContext = {
      port,
      hostOrigin: event.origin,
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

      case "open_modal": {
        await handleOpenModal(ctx, message);
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

      // @NOTE: Switch to handleOAuthInfoPassV2 for ed25519 support
      case "oauth_info_pass": {
        await handleOAuthInfoPassV2(ctx, message);
        break;
      }

      case "__get_connected_apps__": {
        await handleGetConnectedApps(ctx);
        break;
      }

      default:
        console.error(
          `[attached] unimplemented, msg_type: ${message.msg_type}`,
        );

        throw new Error(`unimplemented, msg_type: ${message.msg_type}`);
    }
  };
}
