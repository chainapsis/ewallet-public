import { NativeModules, Platform } from "react-native";

/**
 * Default callback scheme used by OkoAuthCallbackActivity on Android.
 * The library's AndroidManifest.xml registers this scheme on the
 * CallbackActivity, so Android routes the redirect there without a
 * disambiguation popup. Overridable via `androidCallbackScheme` in
 * OkoWalletRNConfig and `callbackScheme` in the Expo config plugin.
 */
const DEFAULT_ANDROID_CALLBACK_SCHEME = "oko.auth.callback";

interface OkoAuthBrowserNative {
  openAuthSessionAsync(url: string, callbackScheme: string): Promise<string>;
  cancelAuthSession(): void;
}

let nativeModule: OkoAuthBrowserNative | null = null;

if (Platform.OS === "android") {
  try {
    nativeModule = NativeModules.OkoAuthBrowser ?? null;
  } catch {
    // Native module not available — fall back to web browser library
  }
}

export type AuthSessionResult =
  | { type: "success"; url: string }
  | { type: "cancel" };

type AuthOpener = (
  url: string,
  redirectUrl: string,
) => Promise<AuthSessionResult>;

/**
 * Detects which auth browser library is available at runtime.
 * Tries expo-web-browser first, then react-native-inappbrowser-reborn.
 */
function resolveAuthOpener(): AuthOpener {
  // Try expo-web-browser first
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebBrowser = require("expo-web-browser");
    return async (url: string, redirectUrl: string) => {
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
      if (result.type === "success" && result.url) {
        return { type: "success", url: result.url };
      }
      return { type: "cancel" };
    };
  } catch {
    // expo-web-browser not available
  }

  // Fall back to react-native-inappbrowser-reborn
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InAppBrowser } = require("react-native-inappbrowser-reborn");
    return async (url: string, redirectUrl: string) => {
      const result = await InAppBrowser.openAuth(url, redirectUrl, {
        ephemeralWebSession: false,
      });
      if (result.type === "success" && result.url) {
        return { type: "success", url: result.url };
      }
      return { type: "cancel" };
    };
  } catch {
    // react-native-inappbrowser-reborn not available
  }

  // Neither available
  return async () => {
    throw new Error(
      "[oko-rn] OkoAuthBrowser: Install either expo-web-browser or react-native-inappbrowser-reborn",
    );
  };
}

const openAuthViaWebBrowser = resolveAuthOpener();

/**
 * Returns the redirect scheme to pass to the server.
 * Android (native module): SDK's dedicated callback scheme for CallbackActivity.
 * iOS / fallback: app's own scheme for ASWebAuthenticationSession auto-close.
 */
export function getServerRedirectScheme(
  appScheme: string,
  androidCallbackScheme?: string,
): string {
  if (Platform.OS === "android" && nativeModule) {
    return androidCallbackScheme ?? DEFAULT_ANDROID_CALLBACK_SCHEME;
  }
  return appScheme;
}

/**
 * Open an auth session in the system browser.
 *
 * - Android (primary): Chrome Custom Tab via native OkoAuthBrowserModule.
 *   ManagementActivity keeps the Custom Tab in the same task as the app.
 *   CallbackActivity receives the redirect and uses CLEAR_TOP to pop
 *   the Custom Tab — no "Open in app?" popup.
 * - iOS: ASWebAuthenticationSession via detected auth browser library.
 * - Android (fallback): same as iOS if native module unavailable.
 */
export async function openAuthSession(
  url: string,
  callbackScheme: string,
  androidCallbackScheme?: string,
): Promise<AuthSessionResult> {
  if (Platform.OS === "android" && nativeModule) {
    const scheme = androidCallbackScheme ?? DEFAULT_ANDROID_CALLBACK_SCHEME;
    try {
      const callbackUrl = await nativeModule.openAuthSessionAsync(url, scheme);
      return { type: "success", url: callbackUrl };
    } catch {
      // Promise was rejected (user pressed back)
      return { type: "cancel" };
    }
  }

  // iOS (or Android fallback): use detected library
  return openAuthViaWebBrowser(url, `${callbackScheme}://`);
}
