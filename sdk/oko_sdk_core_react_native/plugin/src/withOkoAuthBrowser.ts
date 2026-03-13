import { type ConfigPlugin, createRunOncePlugin } from "@expo/config-plugins";

import { withOkoAuthBrowserAndroid } from "./withOkoAuthBrowserAndroid";

const DEFAULT_CALLBACK_SCHEME = "oko.auth.callback";

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
