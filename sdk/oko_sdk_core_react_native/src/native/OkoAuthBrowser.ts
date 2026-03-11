import { Platform } from "react-native";
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
 * Android (native module): SDK's dedicated callback scheme for CallbackActivity.
 * iOS / fallback: app's own scheme for ASWebAuthenticationSession auto-close.
 */
export function getServerRedirectScheme(appScheme: string): string {
  if (Platform.OS === "android" && nativeModule) {
    return ANDROID_CALLBACK_SCHEME;
  }
  return appScheme;
}

/**
 * Open an auth session in the system browser.
 *
 * - iOS: ASWebAuthenticationSession via expo-web-browser
 * - Android: Chrome Custom Tab via native OkoAuthBrowserModule.
 *   ManagementActivity keeps the Custom Tab in the same task as the app.
 *   CallbackActivity receives the redirect and uses CLEAR_TOP to pop
 *   the Custom Tab — no "Open in app?" popup.
 *   (Falls back to expo-web-browser if the native module is unavailable.)
 */
export async function openAuthSession(
  url: string,
  callbackScheme: string,
): Promise<AuthSessionResult> {
  if (Platform.OS === "android" && nativeModule) {
    try {
      const callbackUrl = await nativeModule.openAuthSessionAsync(url);
      return { type: "success", url: callbackUrl };
    } catch {
      // CompletableDeferred was cancelled (user pressed back)
      return { type: "cancel" };
    }
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
