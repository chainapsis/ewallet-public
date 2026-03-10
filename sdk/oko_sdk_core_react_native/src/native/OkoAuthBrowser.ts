import { Platform, AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import * as WebBrowser from "expo-web-browser";

/**
 * SDK-internal callback scheme used by OkoAuthCallbackActivity on Android.
 * The Expo config plugin registers this scheme on the CallbackActivity,
 * so Android routes the redirect there without a disambiguation popup.
 */
export const ANDROID_CALLBACK_SCHEME = "oko.auth.callback";

interface OkoAuthBrowserNative {
  openAuthSessionAsync(url: string): Promise<string>;
  cancelAuthSession(): void;
}

let nativeModule: OkoAuthBrowserNative | null = null;

if (Platform.OS === "android") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require("expo-modules-core");
    nativeModule = requireNativeModule("OkoAuthBrowser");
  } catch {
    // Native module not available — fall back to expo-web-browser
  }
}

export type AuthSessionResult =
  | { type: "success"; url: string }
  | { type: "cancel" };

/**
 * Returns the redirect scheme to pass to the server.
 * Android uses a dedicated SDK callback scheme handled by CallbackActivity.
 * iOS uses the app's own scheme handled by ASWebAuthenticationSession.
 */
export function getServerRedirectScheme(appScheme: string): string {
  return Platform.OS === "android" && nativeModule != null
    ? ANDROID_CALLBACK_SCHEME
    : appScheme;
}

/**
 * Open an auth session in the system browser.
 *
 * - iOS: ASWebAuthenticationSession via expo-web-browser
 * - Android: Chrome Custom Tab via native OkoAuthBrowserModule
 *   (falls back to expo-web-browser if the native module is unavailable)
 */
export async function openAuthSession(
  url: string,
  callbackScheme: string,
): Promise<AuthSessionResult> {
  if (Platform.OS === "android" && nativeModule) {
    return androidOpenAuthSession(url, nativeModule);
  }

  // iOS (or Android fallback)
  const result = await WebBrowser.openAuthSessionAsync(
    url,
    `${callbackScheme}://`,
  );
  if (result.type === "success") {
    return { type: "success", url: result.url };
  }
  return { type: "cancel" };
}

/**
 * Android-specific implementation.
 * Opens a Chrome Custom Tab and races two signals:
 * 1. CallbackActivity receives the redirect → CompletableDeferred completes
 * 2. User presses back → AppState becomes "active" without a callback
 */
function androidOpenAuthSession(
  url: string,
  mod: OkoAuthBrowserNative,
): Promise<AuthSessionResult> {
  return new Promise((resolve) => {
    let settled = false;

    const onAppState = (state: AppStateStatus) => {
      if (state === "active" && !settled) {
        // Small delay so CallbackActivity can fire first if this is a redirect
        setTimeout(() => {
          if (!settled) {
            settled = true;
            subscription.remove();
            mod.cancelAuthSession();
            resolve({ type: "cancel" });
          }
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener("change", onAppState);

    mod.openAuthSessionAsync(url).then(
      (callbackUrl) => {
        if (!settled) {
          settled = true;
          subscription.remove();
          resolve({ type: "success", url: callbackUrl });
        }
      },
      () => {
        if (!settled) {
          settled = true;
          subscription.remove();
          resolve({ type: "cancel" });
        }
      },
    );
  });
}

/**
 * Dismiss the current auth session (close the Custom Tab / Safari VC).
 */
export function dismissAuthSession(): void {
  if (Platform.OS === "android" && nativeModule) {
    nativeModule.cancelAuthSession();
    return;
  }
  WebBrowser.dismissAuthSession();
}
