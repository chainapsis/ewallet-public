export const OKO_SDK_TARGET = "oko_sdk";

export const OKO_ATTACHED_POPUP = "oko_attached_popup";

/**
 * BroadcastChannel name used for OAuth callback → attached iframe communication.
 * Fallback for Safari (iOS) where window.opener is null after cross-origin navigation.
 */
export const OAUTH_BROADCAST_CHANNEL = "oko_oauth_callback";
