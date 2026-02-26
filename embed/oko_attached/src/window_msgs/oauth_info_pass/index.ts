import type { Result } from "@oko-wallet/stdlib-js";
import type {
  OkoWalletMsgOAuthInfoPass,
  OkoWalletMsgOAuthInfoPassAck,
  OkoWalletMsgOAuthSignInUpdate,
  OAuthSignInError,
} from "@oko-wallet/oko-sdk-core";
import type {
  CheckEmailResponse,
  CheckEmailResponseV2,
} from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { sendMsgToWindow } from "../send";
import {
  OKO_ATTACHED_POPUP,
  OKO_SDK_TARGET,
} from "@oko-wallet-attached/window_msgs/target";
import type { MsgEventContext } from "@oko-wallet-attached/window_msgs/types";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import {
  setUserId,
  setUserProperties,
} from "@oko-wallet-attached/analytics/amplitude";
import type {
  UserSignInResult,
  UserSignInResultV2,
} from "@oko-wallet-attached/window_msgs/types";
import {
  checkUserExists,
  handleExistingUser,
  handleNewUser,
  handleReshare,
} from "./user";
import { checkUserExistsV2 } from "./handlers/check_user";
import { handleNewUserV2 } from "./handlers/new_user";
import { handleExistingUserV2 } from "./handlers/existing_user";
import { handleReshareV2 } from "./handlers/reshare";
import {
  handleExistingUserNeedsEd25519Keygen,
  handleReshareAndEd25519Keygen,
} from "./handlers/ed25519_keygen";
import { bail } from "./errors";
import { getCredentialsFromPayload } from "./validate_social_login";
import {
  hasActiveReAuthResolver,
  consumeReAuthResolver,
  rejectReAuthResolver,
} from "../export_reauth_state";

export async function handleOAuthInfoPass(
  ctx: MsgEventContext,
  message: OkoWalletMsgOAuthInfoPass,
): Promise<void> {
  const { port } = ctx;
  const appState = useAppState.getState();
  const hostOrigin = message.payload.target_origin;

  let hasSignedIn = false;
  let isNewUser = false;

  try {
    if (message.msg_type !== "oauth_info_pass") {
      await bail(message, {
        type: "invalid_msg_type",
        msg_type: message.msg_type,
      });
      return;
    }

    if (!appState.getHostOriginList().includes(hostOrigin)) {
      await bail(message, { type: "origin_not_registered" });
      return;
    }

    const apiKey = message.payload.api_key;
    if (!apiKey) {
      await bail(message, { type: "api_key_missing" });
      return;
    }
    appState.setApiKey(hostOrigin, apiKey);

    const authType: AuthType = message.payload.auth_type;

    const validateOauthRes = await getCredentialsFromPayload(
      message.payload,
      hostOrigin,
    );

    if (!validateOauthRes.success) {
      await bail(message, validateOauthRes.err);
      return;
    }

    const { idToken, userIdentifier } = validateOauthRes.data;

    const userExistsRes = await checkUserExists(userIdentifier, authType);
    if (!userExistsRes.success) {
      await bail(message, {
        type: "check_user_request_fail",
        error: userExistsRes.err.toString(),
      });
      return;
    }

    const userExistsResp = userExistsRes.data;
    if (!userExistsResp.success) {
      await bail(message, {
        type: "check_user_request_fail",
        error: userExistsResp.msg,
      });
      return;
    }
    const userExists = userExistsResp.data;

    // Highest-priority guard: global active nodes below threshold → block all flows
    if (userExists.active_nodes_below_threshold) {
      await bail(message, {
        type: "active_nodes_below_threshold",
      });
      return;
    }

    const handleUserSignInRes = await handleUserSignIn(
      idToken,
      userExists,
      authType,
      apiKey,
    );
    if (!handleUserSignInRes.success) {
      await bail(message, handleUserSignInRes.err);
      return;
    }

    const signInResult = handleUserSignInRes.data;
    appState.setKeyshare_1(hostOrigin, signInResult.keyshare_1);
    appState.setAuthToken(hostOrigin, signInResult.jwtToken);
    appState.setWallet(hostOrigin, {
      authType,
      walletId: signInResult.walletId,
      publicKey: signInResult.publicKey,
      email: signInResult.email,
      name: signInResult.name,
    });

    hasSignedIn = true;
    isNewUser = signInResult.isNewUser;

    const updateMsg: OkoWalletMsgOAuthSignInUpdate = {
      target: OKO_SDK_TARGET,
      msg_type: "oauth_sign_in_update",
      payload: { success: true, data: null },
    };

    await sendMsgToWindow(window.parent, updateMsg, hostOrigin);
  } catch (error: any) {
    await bail(message, { type: "unknown", error: error.toString() });
    return;
  } finally {
    if (hasSignedIn) {
      const wallet = appState.getWallet(hostOrigin);
      if (wallet?.walletId) {
        setUserId(wallet.walletId);
        if (isNewUser) {
          setUserProperties({
            authType: message.payload.auth_type as AuthType,
            createdOrigin: hostOrigin,
          });
        }
      }
    }

    const infoPassAck: OkoWalletMsgOAuthInfoPassAck = {
      target: OKO_ATTACHED_POPUP,
      msg_type: "oauth_info_pass_ack",
      payload: null,
    };

    port.postMessage(infoPassAck);
    appState.setNonce(hostOrigin, null);
  }
}

export async function handleUserSignIn(
  idToken: string,
  userExists: CheckEmailResponse,
  authType: AuthType,
  apiKey: string,
): Promise<Result<UserSignInResult, OAuthSignInError>> {
  const meta = userExists.keyshare_node_meta;

  // use user sign up flow
  if (!userExists.exists) {
    const { referralInfo } = useMemoryState.getState();
    const signInRes = await handleNewUser(
      idToken,
      meta,
      authType,
      apiKey,
      referralInfo,
    );
    if (!signInRes.success) {
      return {
        success: false,
        err: signInRes.err,
      };
    }
    return {
      success: true,
      data: signInRes.data,
    };
  }
  // existing user sign in or reshare flow
  else {
    // reshare flow
    if (userExists.needs_reshare) {
      const signInRes = await handleReshare(idToken, meta, authType);
      if (!signInRes.success) {
        throw signInRes.err;
      }
      return {
        success: true,
        data: signInRes.data,
      };
    }
    // sign in flow
    else {
      const signInRes = await handleExistingUser(
        idToken,
        meta,
        authType,
        apiKey,
      );
      if (!signInRes.success) {
        throw signInRes.err;
      }
      return {
        success: true,
        data: signInRes.data,
      };
    }
  }
}

export async function handleOAuthInfoPassV2(
  ctx: MsgEventContext,
  message: OkoWalletMsgOAuthInfoPass,
): Promise<void> {
  const { port } = ctx;
  const appState = useAppState.getState();
  const hostOrigin = message.payload.target_origin;

  let hasSignedIn = false;
  let isNewUser = false;

  try {
    if (message.msg_type !== "oauth_info_pass") {
      await bail(message, {
        type: "invalid_msg_type",
        msg_type: message.msg_type,
      });
      return;
    }

    // Re-auth interceptor: if an export request is waiting for re-auth credentials,
    // extract OAuth credentials and resolve the pending promise.
    // Fires before api_key/hostOriginList checks (re-auth uses attached origin with no SDK API key).
    // Mutual exclusion: only one resolver can be active at a time (module-level singleton in
    // export_reauth_state.ts), so a normal sign-in callback cannot be intercepted during export.
    if (hasActiveReAuthResolver()) {
      const authType: AuthType = message.payload.auth_type;
      const validateOauthRes = await getCredentialsFromPayload(
        message.payload,
        hostOrigin,
      );

      if (!validateOauthRes.success) {
        rejectReAuthResolver(validateOauthRes.err.type);
      } else {
        consumeReAuthResolver({
          idToken: validateOauthRes.data.idToken,
          userIdentifier: validateOauthRes.data.userIdentifier,
          authType,
        });
      }
      return; // finally block handles ack + nonce cleanup
    }

    if (!appState.getHostOriginList().includes(hostOrigin)) {
      await bail(message, { type: "origin_not_registered" });
      return;
    }

    const apiKey = message.payload.api_key;
    if (!apiKey) {
      await bail(message, { type: "api_key_missing" });
      return;
    }
    appState.setApiKey(hostOrigin, apiKey);

    const authType: AuthType = message.payload.auth_type;

    const validateOauthRes = await getCredentialsFromPayload(
      message.payload,
      hostOrigin,
    );

    if (!validateOauthRes.success) {
      await bail(message, validateOauthRes.err);
      return;
    }

    const { idToken, userIdentifier } = validateOauthRes.data;

    const userExistsRes = await checkUserExistsV2(userIdentifier, authType);
    if (!userExistsRes.success) {
      await bail(message, {
        type: "check_user_request_fail",
        error: userExistsRes.err.toString(),
      });
      return;
    }

    const checkEmailResp = userExistsRes.data;
    if (!checkEmailResp.success) {
      await bail(message, {
        type: "check_user_request_fail",
        error: checkEmailResp.msg,
      });
      return;
    }
    const checkResult = checkEmailResp.data;

    // Highest-priority guard: active nodes below threshold → block all flows
    // All response types now have unified active_nodes_below_threshold at top level
    if (checkResult.active_nodes_below_threshold) {
      await bail(message, {
        type: "active_nodes_below_threshold",
      });
      return;
    }

    const handleUserSignInRes = await handleUserSignInV2(
      idToken,
      checkResult,
      authType,
      apiKey,
    );
    if (!handleUserSignInRes.success) {
      await bail(message, handleUserSignInRes.err);
      return;
    }

    const signInResult = handleUserSignInRes.data;
    appState.setKeyshare_1(hostOrigin, signInResult.keyshare1Secp256k1);
    appState.setAuthToken(hostOrigin, signInResult.jwtToken);
    appState.setWallet(hostOrigin, {
      authType,
      walletId: signInResult.walletIdSecp256k1,
      publicKey: signInResult.publicKeySecp256k1,
      email: signInResult.email,
      name: signInResult.name,
    });

    // Store ed25519 key package (signing share) separately
    appState.setKeyPackageEd25519(hostOrigin, signInResult.keyPackageEd25519);

    // Store combined ed25519 user seed share for export
    appState.setSeedEd25519(
      hostOrigin,
      JSON.stringify(signInResult.seedEd25519),
    );

    // Store ed25519 wallet info (without signing share)
    appState.setWalletEd25519(hostOrigin, {
      authType,
      walletId: signInResult.walletIdEd25519,
      publicKeyPackage: signInResult.publicKeyPackageEd25519,
      publicKey: signInResult.publicKeyEd25519,
      email: signInResult.email,
      name: signInResult.name,
    });

    hasSignedIn = true;
    isNewUser = signInResult.isNewUser;

    const updateMsg: OkoWalletMsgOAuthSignInUpdate = {
      target: OKO_SDK_TARGET,
      msg_type: "oauth_sign_in_update",
      payload: { success: true, data: null },
    };

    await sendMsgToWindow(window.parent, updateMsg, hostOrigin);
  } catch (error: any) {
    await bail(message, { type: "unknown", error: error.toString() });
    return;
  } finally {
    if (hasSignedIn) {
      const wallet = appState.getWallet(hostOrigin);
      if (wallet?.walletId) {
        setUserId(wallet.walletId);
        if (isNewUser) {
          setUserProperties({
            authType: message.payload.auth_type as AuthType,
            createdOrigin: hostOrigin,
          });
        }
      }
    }

    const infoPassAck: OkoWalletMsgOAuthInfoPassAck = {
      target: OKO_ATTACHED_POPUP,
      msg_type: "oauth_info_pass_ack",
      payload: null,
    };

    port.postMessage(infoPassAck);
    appState.setNonce(hostOrigin, null);
  }
}

export async function handleUserSignInV2(
  idToken: string,
  checkResult: CheckEmailResponseV2,
  authType: AuthType,
  apiKey?: string,
): Promise<Result<UserSignInResultV2, OAuthSignInError>> {
  // Case 1: User doesn't exist - needs both secp256k1 and ed25519 keygen
  if (!checkResult.exists) {
    const { referralInfo } = useMemoryState.getState();
    const signInRes = await handleNewUserV2(
      idToken,
      checkResult.keyshare_node_meta,
      authType,
      apiKey,
      referralInfo,
    );
    if (!signInRes.success) {
      return {
        success: false,
        err: signInRes.err,
      };
    }
    return {
      success: true,
      data: signInRes.data,
    };
  }

  // Case 2: User exists with only secp256k1 wallet - needs ed25519 keygen
  if (
    "needs_keygen_ed25519" in checkResult &&
    checkResult.needs_keygen_ed25519
  ) {
    const keyshareNodeMeta = checkResult.keyshare_node_meta;

    // Scenario 6: secp256k1 needs reshare + ed25519 needs keygen
    if (checkResult.needs_reshare) {
      const signInRes = await handleReshareAndEd25519Keygen(
        idToken,
        keyshareNodeMeta,
        authType,
      );
      if (!signInRes.success) {
        return {
          success: false,
          err: signInRes.err,
        };
      }
      return {
        success: true,
        data: signInRes.data,
      };
    }

    // Normal ed25519 keygen flow (no reshare needed)
    const signInRes = await handleExistingUserNeedsEd25519Keygen(
      idToken,
      keyshareNodeMeta,
      authType,
    );
    if (!signInRes.success) {
      return {
        success: false,
        err: signInRes.err,
      };
    }
    return {
      success: true,
      data: signInRes.data,
    };
  }

  // Case 3: User exists with both wallets (unified keyshare_node_meta)
  const keyshareNodeMeta = checkResult.keyshare_node_meta;

  if (checkResult.needs_reshare) {
    // V2 reshare flow (unified)
    const signInRes = await handleReshareV2(
      idToken,
      keyshareNodeMeta,
      authType,
      apiKey,
    );
    if (!signInRes.success) {
      return {
        success: false,
        err: signInRes.err,
      };
    }
    return {
      success: true,
      data: signInRes.data,
    };
  }

  // Normal sign in flow
  const signInRes = await handleExistingUserV2(
    idToken,
    keyshareNodeMeta,
    authType,
    apiKey,
  );
  if (!signInRes.success) {
    return {
      success: false,
      err: signInRes.err,
    };
  }
  return {
    success: true,
    data: signInRes.data,
  };
}
