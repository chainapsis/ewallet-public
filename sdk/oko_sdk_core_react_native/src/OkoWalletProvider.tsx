import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet } from "react-native";
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

export function OkoWalletProvider({
  apiKey,
  sdkEndpoint,
  redirectScheme,
  children,
}: OkoWalletProviderProps) {
  const webViewRef = useRef<WebView | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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
    wallet._showModal = () => setModalVisible(true);
    wallet._hideModal = () => setModalVisible(false);

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
      {children}
      <WebView
        ref={webViewRef}
        source={{ uri: bridgePageUrl }}
        style={modalVisible ? styles.visible : styles.hidden}
        onMessage={handleMessage}
        onLoad={handleLoad}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        // Allow third-party cookies for attached iframe session
        thirdPartyCookiesEnabled
        // Prevent WebView from opening links in external browser
        setSupportMultipleWindows={false}
      />
    </OkoWalletContext.Provider>
  );
}

function buildBridgePageUrl(sdkEndpoint: string, apiKey: string): string {
  const url = new URL("/rn", sdkEndpoint);
  // The bridge page will use this as the host_origin for the attached iframe
  url.searchParams.set("host_origin", sdkEndpoint);
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
    // Keep it rendered but invisible so it stays loaded
    overflow: "hidden",
  },
  visible: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});
