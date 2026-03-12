declare module "expo-modules-core" {
  export function requireNativeModule<T = unknown>(moduleName: string): T;
}

declare module "expo-secure-store" {
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function getItemAsync(key: string): Promise<string | null>;
  export function deleteItemAsync(key: string): Promise<void>;
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
