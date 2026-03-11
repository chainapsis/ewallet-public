import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { WalletInfo, OkoWalletMsg } from "@oko-wallet/oko-sdk-core";
import type { WebViewBridge } from "../bridge/WebViewBridge";

export async function getPublicKey(
  bridge: WebViewBridge,
  cachedPublicKey: string | null,
): Promise<string | null> {
  if (cachedPublicKey !== null) return cachedPublicKey;

  const res = await bridge.sendMessage({
    target: "oko_attached",
    msg_type: "get_public_key",
    payload: null,
  } as OkoWalletMsg);

  if (res.msg_type === "get_public_key_ack" && res.payload?.success) {
    return res.payload.data;
  }

  return null;
}

export async function getPublicKeyEd25519(
  bridge: WebViewBridge,
  cachedPublicKey: string | null,
): Promise<string | null> {
  if (cachedPublicKey !== null) return cachedPublicKey;

  const res = await bridge.sendMessage({
    target: "oko_attached",
    msg_type: "get_public_key_ed25519",
    payload: null,
  } as OkoWalletMsg);

  if (res.msg_type === "get_public_key_ed25519_ack" && res.payload?.success) {
    return res.payload.data;
  }

  return null;
}

export async function getEmail(
  bridge: WebViewBridge,
  cachedEmail: string | null,
): Promise<string | null> {
  if (cachedEmail !== null) return cachedEmail;

  const res = await bridge.sendMessage({
    target: "oko_attached",
    msg_type: "get_email",
    payload: null,
  } as OkoWalletMsg);

  if (res.msg_type === "get_email_ack" && res.payload?.success) {
    return res.payload.data;
  }

  return null;
}

export async function getName(
  bridge: WebViewBridge,
  cachedName: string | null,
): Promise<string | null> {
  if (cachedName !== null) return cachedName;

  const res = await bridge.sendMessage({
    target: "oko_attached",
    msg_type: "get_name",
    payload: null,
  } as OkoWalletMsg);

  if (res.msg_type === "get_name_ack" && res.payload?.success) {
    return res.payload.data;
  }

  return null;
}

export async function getWalletInfo(
  bridge: WebViewBridge,
): Promise<WalletInfo | null> {
  const res = await bridge.sendMessage({
    target: "oko_attached",
    msg_type: "get_wallet_info",
    payload: null,
  } as OkoWalletMsg);

  if (res.msg_type === "get_wallet_info_ack" && res.payload?.success) {
    return res.payload.data;
  }

  return null;
}

export async function getAuthType(
  bridge: WebViewBridge,
  cachedAuthType: AuthType | null,
): Promise<AuthType | null> {
  if (cachedAuthType !== null) return cachedAuthType;

  const res = await bridge.sendMessage({
    target: "oko_attached",
    msg_type: "get_auth_type",
    payload: null,
  } as OkoWalletMsg);

  if (res.msg_type === "get_auth_type_ack" && res.payload?.success) {
    return res.payload.data;
  }

  return null;
}
