declare module "expo-modules-core" {
  export function requireNativeModule<T = unknown>(moduleName: string): T;
}

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

declare module "react-native" {
  export const Platform: {
    OS: string;
  };
}
