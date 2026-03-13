import {
  AndroidConfig,
  type ConfigPlugin,
  withAndroidManifest,
} from "@expo/config-plugins";

const CALLBACK_ACTIVITY_CLASS = "com.okowallet.auth.OkoAuthCallbackActivity";
const MANAGEMENT_ACTIVITY_CLASS =
  "com.okowallet.auth.OkoAuthManagementActivity";

export const withOkoAuthBrowserAndroid: ConfigPlugin<{
  callbackScheme: string;
}> = (config, { callbackScheme }) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );

    // Remove existing entries to avoid duplicates on re-prebuild
    if (mainApplication.activity) {
      mainApplication.activity = mainApplication.activity.filter(
        (activity) =>
          activity.$?.["android:name"] !== CALLBACK_ACTIVITY_CLASS &&
          activity.$?.["android:name"] !== MANAGEMENT_ACTIVITY_CLASS,
      );
    } else {
      mainApplication.activity = [];
    }

    // CallbackActivity: handles custom scheme redirect from Chrome Custom Tab.
    // No launchMode — matches flutter_web_auth_2's CallbackActivity pattern.
    mainApplication.activity.push({
      $: {
        "android:name": CALLBACK_ACTIVITY_CLASS,
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
            { $: { "android:name": "android.intent.category.BROWSABLE" } },
          ],
          data: [{ $: { "android:scheme": callbackScheme } }],
        },
      ],
    });

    // ManagementActivity: transparent coordinator that opens Custom Tab and
    // receives CLEAR_TOP intent from CallbackActivity to pop the Custom Tab.
    mainApplication.activity.push({
      $: {
        "android:name": MANAGEMENT_ACTIVITY_CLASS,
        "android:exported": "false",
        "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
      },
    });

    return config;
  });
};
