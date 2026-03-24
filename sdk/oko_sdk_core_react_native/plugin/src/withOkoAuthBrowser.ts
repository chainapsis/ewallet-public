import { type ConfigPlugin, createRunOncePlugin } from "@expo/config-plugins";

import { withOkoAuthBrowserAndroid } from "./withOkoAuthBrowserAndroid";

const DEFAULT_CALLBACK_SCHEME = "oko.auth.callback";

/**
 * Expo config plugin for OkoAuthBrowser Android activities.
 *
 * @param callbackScheme - Custom scheme registered on OkoAuthCallbackActivity's
 *   intent-filter (default: "oko.auth.callback"). If you override this, you MUST
 *   also pass the same value as `androidCallbackScheme` to `OkoWalletRNConfig` /
 *   `OkoWalletProvider` so the runtime and manifest agree. Mismatched values will
 *   cause the CustomTabs fallback path to fail (the SDK logs a warning at runtime).
 */
const withOkoAuthBrowser: ConfigPlugin<
  { callbackScheme?: string } | undefined
> = (config, props) => {
  const callbackScheme = props?.callbackScheme ?? DEFAULT_CALLBACK_SCHEME;
  config = withOkoAuthBrowserAndroid(config, { callbackScheme });
  return config;
};

export default createRunOncePlugin(
  withOkoAuthBrowser,
  "@oko-wallet/oko-sdk-core-react-native",
);
