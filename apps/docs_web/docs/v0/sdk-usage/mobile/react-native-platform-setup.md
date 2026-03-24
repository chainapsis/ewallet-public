---
title: React Native Platform Setup
sidebar_position: 2
---

# React Native Platform Setup

Platform-specific configuration for iOS and Android before using the Oko React
Native SDK. Covers the Expo config plugin, deep link setup for both Expo and
bare React Native, and browser dependency selection.

<!-- prettier-ignore -->
:::tip
This page covers project configuration. For SDK usage (authentication, wallet
methods, transaction signing), see
**[React Native Integration](./react-native-integration)**.
:::

## Expo Config Plugin

The Oko SDK includes an Expo config plugin that automatically configures Android
intent filters for the OAuth callback redirect.

<!-- prettier-ignore -->
:::warning
The Expo config plugin **only modifies Android** configuration. iOS deep link
setup for Expo is handled via the `expo.scheme` field in `app.json` (see
[Deep Link Setup](#expo-projects) below).
:::

Add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["@oko-wallet/oko-sdk-core-react-native"]
  }
}
```

The Expo config plugin writes the Android callback scheme into the manifest. To
use a custom scheme, pass the same value as `androidCallbackScheme` to
`OkoWalletProvider` (or `OkoWalletRNConfig`) so the runtime and manifest agree:

```json
{
  "expo": {
    "plugins": [
      [
        "@oko-wallet/oko-sdk-core-react-native",
        { "callbackScheme": "com.myapp.auth" }
      ]
    ]
  }
}
```

```tsx
<OkoWalletProvider
  apiKey="your-api-key"
  androidCallbackScheme="com.myapp.auth"
>
```

The default scheme is `"oko.auth.callback"`. Since all apps using the Oko SDK
share this default, users who install multiple Oko-powered apps on the same
device may see an Android disambiguation popup or have callbacks routed to the
wrong app. Setting a unique `androidCallbackScheme` per app (e.g., using your
app's package name) avoids this collision.

After adding the plugin, regenerate native projects:

```bash
npx expo prebuild
```

## Deep Link Setup

The RN SDK uses deep links to return from the OS browser to your app after
authentication and signing operations. Two schemes are involved:

| Scheme           | Purpose                                     | Configured via                                          |
| ---------------- | ------------------------------------------- | ------------------------------------------------------- |
| `redirectScheme` | App-level deep link scheme used by iOS and Android fallback flows | `OkoWalletProvider` prop + native URL scheme             |
| `callbackScheme` | Android-only internal callback for `CallbackActivity` | SDK Android manifest / Expo plugin + `androidCallbackScheme` prop (default: `"oko.auth.callback"`) |

On Android when the native `OkoAuthBrowser` module is available, browser auth
and signing callbacks use the internal `callbackScheme`. Your app's
`redirectScheme` should still be registered uniquely for app deep links and
fallback paths.

### Expo Projects

#### iOS

Set the app scheme in `app.json`:

```json
{
  "expo": {
    "scheme": "okowallet"
  }
}
```

On iOS, `ASWebAuthenticationSession` handles the callback automatically. No
additional `Info.plist` changes are needed for the auth session itself.

#### Android

The Expo config plugin handles intent filter injection automatically. After
`npx expo prebuild`, the following is added to `AndroidManifest.xml`:

- Oko callback and management Activities for the internal callback scheme
  (default: `oko.auth.callback`, customizable via the plugin's `callbackScheme`
  option)

Your app's standard deep link intent filter comes from Expo's `scheme`
configuration, not from the Oko plugin.

Verify with:

```bash
npx uri-scheme list
```

### Bare React Native

#### iOS

Add your URL scheme to `ios/YourApp/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>okowallet</string>
    </array>
  </dict>
</array>
```

Ensure `AppDelegate` is configured for URL handling. For
`react-native-inappbrowser-reborn`, React Native 0.60+ uses autolinking, but
you should still run `cd ios && pod install`.

#### Android

Add intent filters to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Main deep link for app return -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="okowallet" />
</intent-filter>
```

The Oko SDK Android library already includes the callback and management
Activities needed for the internal callback scheme flow (default:
`oko.auth.callback`). In a standard React Native setup, you usually do **not**
need to register them manually. If you use a custom `androidCallbackScheme`, you
must also override the scheme in `AndroidManifest.xml` on the
`OkoAuthCallbackActivity` intent filter to match.

## Redirect Scheme Configuration

The `redirectScheme` tells the SDK your app's own URL scheme.

- **iOS / Android fallback:** the OS browser uses this scheme to return to your
  app
- **Android native module path:** browser auth callbacks use the internal
  `callbackScheme` instead

- **Default:** `"okowallet"`
- **Customizing:** Pass the `redirectScheme` prop to `OkoWalletProvider`
- **Critical:** The scheme must exactly match what is registered in your native
  project for your app-level deep links (`Info.plist` on iOS,
  `AndroidManifest.xml` on Android)

```typescript
<OkoWalletProvider
  apiKey="your-api-key"
  redirectScheme="myapp"
>
  <YourApp />
</OkoWalletProvider>
```

**Summary of where each scheme is used:**

| Value                                       | Where configured                               | Where used                                                    |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| `redirectScheme` (e.g., `"okowallet"`)      | `OkoWalletProvider` prop, `Info.plist`, `AndroidManifest.xml` | App-level deep links; used directly by iOS and Android fallback browser flows |
| `callbackScheme` (default `"oko.auth.callback"`) | SDK Android manifest / Expo plugin + `androidCallbackScheme` prop | Android `OkoAuthCallbackActivity` receives the internal auth callback; customizable to avoid scheme collisions between apps |

## Browser Dependency Selection

Choose one browser dependency based on your project type:

| Package                            | Recommended for         | Install command                                                                |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `expo-web-browser`                 | Expo projects or RN apps already using Expo modules | `npx expo install expo-web-browser`                                            |
| `react-native-inappbrowser-reborn` | Bare RN without Expo    | `npm install react-native-inappbrowser-reborn && cd ios && pod install`         |

The SDK auto-detects which package is installed. If both are installed,
`expo-web-browser` takes priority.

<!-- prettier-ignore -->
:::note
If you install `expo-web-browser` in an existing bare React Native app, Expo
also requires the `expo` package to be installed in that app.
:::

## Verification Checklist

After completing setup, verify everything is configured correctly:

- [ ] **Peer dependencies installed:**
  `@react-native-async-storage/async-storage`,
  `react-native-get-random-values`, and one browser dependency
- [ ] **Expo plugin added** (Expo projects only): plugin entry in `app.json`,
  ran `npx expo prebuild`
- [ ] **URL scheme registered:** `okowallet` (or custom) appears in `Info.plist`
  (iOS) and `AndroidManifest.xml` (Android)
- [ ] **Deep link test:** Open `okowallet://` from device browser — app should
  open
- [ ] **CallbackActivity registered** (Android, if using native module):
  callback scheme (default `oko.auth.callback`, or your custom
  `androidCallbackScheme`) in `AndroidManifest.xml`
- [ ] **Pod install complete** (iOS, bare RN): Run `cd ios && pod install`

### Common Setup Issues

| Issue                          | Cause                                           | Fix                                                                        |
| ------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------- |
| Scheme mismatch                | `redirectScheme` prop doesn't match native config | Ensure the same string is in `OkoWalletProvider`, `Info.plist`, and `AndroidManifest.xml` |
| Missing prebuild               | Expo plugin changes not applied                 | Run `npx expo prebuild` after modifying `app.json`                         |
| Android disambiguation popup   | Multiple apps handle the same scheme            | Use a unique `redirectScheme`; also set a unique `androidCallbackScheme` to avoid collisions with other Oko-powered apps on the same device |
| Pod install needed             | Native iOS deps not linked                      | Run `cd ios && pod install`                                                |

## Next Steps

- **[React Native Integration](./react-native-integration)** — SDK usage guide
- **[SDK Overview](../sdk-overview)** — All available SDK packages
