import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

import { WebViewBridge } from "./bridge/WebViewBridge";
import { OkoWalletRN, type OkoWalletRNConfig } from "./OkoWalletRN";

export const OkoWalletContext = createContext<OkoWalletRN | null>(null);

export interface OkoWalletProviderProps {
  /** Oko API key */
  apiKey: string;
  /** Proxy endpoint that serves the bridge page (e.g. https://proxy.oko.app) */
  sdkEndpoint: string;
  /** Deep link scheme for OAuth callbacks (default: "okowallet") */
  redirectScheme?: string;
  children: React.ReactNode;
}

/**
 * Provider component that manages the hidden WebView bridge.
 *
 * The WebView is always hidden — it only handles read-only operations
 * (getPublicKey, getEmail, etc.) via the attached iframe.
 *
 * Signing and login happen in the OS browser, not the WebView.
 * Key shares NEVER exist in this WebView.
 */
export function OkoWalletProvider({
  apiKey,
  sdkEndpoint,
  redirectScheme,
  children,
}: OkoWalletProviderProps) {
  const webViewRef = useRef<WebView | null>(null);

  const wallet = useMemo(() => {
    const config: OkoWalletRNConfig = {
      apiKey,
      sdkEndpoint,
      redirectScheme,
    };
    return new OkoWalletRN(config);
  }, [apiKey, sdkEndpoint, redirectScheme]);

  const bridge = useMemo(() => {
    return new WebViewBridge(webViewRef);
  }, []);

  // Connect bridge to wallet
  useEffect(() => {
    wallet._setBridge(bridge);

    return () => {
      bridge.dispose();
    };
  }, [wallet, bridge]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      bridge.handleMessage(event.nativeEvent.data);
    },
    [bridge],
  );

  const handleLoad = useCallback(() => {
    bridge.setReady(true);
  }, [bridge]);

  const bridgePageUrl = buildBridgePageUrl(sdkEndpoint, apiKey);

  return (
    <OkoWalletContext.Provider value={wallet}>
      <View style={styles.container}>{children}</View>
      {/* WebView is always hidden — read-only bridge only, no key shares */}
      <View style={styles.webviewContainer} pointerEvents="none">
        <WebView
          ref={webViewRef}
          source={{ uri: bridgePageUrl }}
          style={styles.webview}
          onMessage={handleMessage}
          onLoad={handleLoad}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
        />
      </View>
    </OkoWalletContext.Provider>
  );
}

function buildBridgePageUrl(sdkEndpoint: string, apiKey: string): string {
  const url = new URL("/rn", sdkEndpoint);
  url.searchParams.set("host_origin", sdkEndpoint);
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webviewContainer: {
    position: "absolute",
    width: 0,
    height: 0,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
  },
});
