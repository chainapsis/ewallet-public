declare module "@react-native-async-storage/async-storage" {
  const AsyncStorage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  };
  export default AsyncStorage;
}

declare module "expo-web-browser" {
  export type WebBrowserAuthSessionResult =
    | { type: "success"; url: string }
    | { type: string; url?: string };

  export function openAuthSessionAsync(
    url: string,
    redirectUrl?: string | null,
  ): Promise<WebBrowserAuthSessionResult>;
}

declare module "react-native-inappbrowser-reborn" {
  export interface InAppBrowserClassType {
    openAuth(
      url: string,
      redirectUrl: string,
      options?: { ephemeralWebSession?: boolean },
    ): Promise<{ type: "success" | "cancel" | "dismiss"; url?: string }>;
  }
  export const InAppBrowser: InAppBrowserClassType;
}

declare module "react-native" {
  export const Platform: {
    OS: string;
  };
  export const NativeModules: Record<string, any>;
}
