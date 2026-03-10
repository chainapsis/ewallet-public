import {
  type ConfigPlugin,
  withAndroidManifest,
  AndroidConfig,
} from "@expo/config-plugins";

const ACTIVITY_CLASS = "com.okowallet.auth.OkoAuthCallbackActivity";

export const withOkoAuthBrowserAndroid: ConfigPlugin<{
  callbackScheme: string;
}> = (config, { callbackScheme }) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication =
      AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    // Remove existing entries to avoid duplicates on re-prebuild
    if (mainApplication.activity) {
      mainApplication.activity = mainApplication.activity.filter(
        (activity) => activity.$?.["android:name"] !== ACTIVITY_CLASS,
      );
    } else {
      mainApplication.activity = [];
    }

    mainApplication.activity.push({
      $: {
        "android:name": ACTIVITY_CLASS,
        "android:exported": "true",
        "android:launchMode": "singleTop",
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

    return config;
  });
};
