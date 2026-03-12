"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withOkoAuthBrowserAndroid_1 = require("./withOkoAuthBrowserAndroid");
const DEFAULT_CALLBACK_SCHEME = "oko.auth.callback";
const withOkoAuthBrowser = (config, props) => {
    const callbackScheme = props?.callbackScheme ?? DEFAULT_CALLBACK_SCHEME;
    config = (0, withOkoAuthBrowserAndroid_1.withOkoAuthBrowserAndroid)(config, { callbackScheme });
    return config;
};
exports.default = (0, config_plugins_1.createRunOncePlugin)(withOkoAuthBrowser, "@oko-wallet/oko-sdk-core-react-native");
