---
title: React Native Integration
sidebar_position: 1
---

# React Native Integration

Complete guide for integrating Oko into React Native applications, covering both
Expo and bare React Native projects.

<!-- prettier-ignore -->
:::info SDK Architecture
The React Native SDK (`@oko-wallet/oko-sdk-core-react-native`) is the
**platform adapter** for React Native. It replaces the web core's
iframe/postMessage transport with OS browser + deep links.

The chain-specific SDKs (`@oko-wallet/oko-sdk-eth`,
`@oko-wallet/oko-sdk-cosmos`, `@oko-wallet/oko-sdk-svm`) **work in React
Native** — pass the RN wallet instance to their constructors:

```typescript
import { useOkoWallet } from "@oko-wallet/oko-sdk-core-react-native";
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";


const wallet = useOkoWallet();
const eth = new OkoEthWallet(wallet);
```

:::

<!-- prettier-ignore -->
:::tip
For platform-specific configuration (Expo plugin, deep links, browser dependency
selection), see
**[React Native Platform Setup](./react-native-platform-setup)** before
proceeding.
:::

## How It Works

The React Native SDK uses the OS browser for all authentication and signing
operations instead of an embedded WebView:

1. Your RN app calls an SDK method (e.g., `signIn`, `openModal`)
2. The SDK opens the system browser (ASWebAuthenticationSession on iOS, Chrome
   Custom Tabs on Android)
3. The browser loads `attached_mobile_host_web`, which hosts the `oko_attached`
   iframe
4. `oko_attached` handles cryptographic operations (keygen, signing via WASM)
5. The result returns to your app via a deep link redirect

This approach is more secure than embedding a WebView — it provides native
browser features like password managers and biometric authentication, and
prevents JavaScript injection.

Polyfills for `Buffer`, `Event`, and `crypto.getRandomValues` are automatically
applied when you import from the package. No manual polyfill setup is needed.

## Installation

### Install the SDK

```bash
npm install @oko-wallet/oko-sdk-core-react-native
```

### Chain SDKs (optional)

Install the chain-specific SDKs you need. They use the RN wallet as their
transport layer — no additional browser dependencies required.

```bash
# For Ethereum / EVM chains
npm install @oko-wallet/oko-sdk-eth

# For Cosmos chains
npm install @oko-wallet/oko-sdk-cosmos

# For Solana
npm install @oko-wallet/oko-sdk-svm
```

### Required Peer Dependencies

```bash
npm install @react-native-async-storage/async-storage react-native-get-random-values
```

- `@react-native-async-storage/async-storage` — Persists wallet session across
  app restarts
- `react-native-get-random-values` — Provides cryptographic randomness

### Browser Dependency (one required)

You must install **one** of the following browser dependencies:

| Package                            | Best for      | Notes                              |
| ---------------------------------- | ------------- | ---------------------------------- |
| `expo-web-browser`                 | Expo projects | Recommended for Expo managed workflow |
| `react-native-inappbrowser-reborn` | Bare RN       | Uses autolinking on RN 0.60+; iOS still needs `pod install` |

```bash
# For Expo projects
npx expo install expo-web-browser

# For bare React Native projects
npm install react-native-inappbrowser-reborn
cd ios && pod install
```

## Basic Setup

### Provider Setup

Wrap your app root with `OkoWalletProvider`:

```typescript
// App.tsx
import { OkoWalletProvider } from "@oko-wallet/oko-sdk-core-react-native";

export default function App() {
  return (
    <OkoWalletProvider apiKey="your-api-key">
      <></>
    </OkoWalletProvider>
  );
}
```

**Provider props:**

| Prop             | Required | Default                    | Description                                                                                                                                |
| ---------------- | -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `apiKey`         | Yes      | —                          | Your Oko API key                                                                                                                           |
| `sdkEndpoint`    | No       | `https://mobile.oko.app`  | Mobile host endpoint. Override for [self-hosted deployments](#sdkendpoint-for-self-hosted-deployments).                                    |
| `redirectScheme` | No       | `"okowallet"`              | Your app's URL scheme. iOS and Android fallback flows use it directly; it should match the scheme configured in your native project (see [Platform Setup](./react-native-platform-setup)). |
| `androidCallbackScheme` | No | `"oko.auth.callback"` | Android-only callback scheme for `OkoAuthCallbackActivity`. Must match `callbackScheme` in the Expo config plugin or your `AndroidManifest` intent-filter. Set a unique value per app to avoid collisions when multiple Oko-powered apps are installed on the same device. See [Platform Setup](./react-native-platform-setup). |

### Using the Hook

```typescript
import { useEffect } from "react";
import { useOkoWallet } from "@oko-wallet/oko-sdk-core-react-native";

function WalletScreen() {
  const wallet = useOkoWallet();

  useEffect(() => {
    wallet.waitUntilInitialized.then((result) => {
      if (result.success) {
        // SDK is ready, session restored if user was previously signed in
        console.log("Oko initialized:", result.data);
      }
    });
  }, []);

  // ... use wallet methods
}
```

`useOkoWallet()` returns an `OkoWalletRN` instance. Always await
`waitUntilInitialized` before using wallet methods — it is a **Promise
property** (not a method), so use it without parentheses. It resolves once
AsyncStorage state is restored.

## Authentication

### Sign In

```typescript
// type: "google" | "email" | "discord" | "github" | "x" | "telegram"
await wallet.signIn("google");
```

**Supported sign-in types:**

| Type        | Provider          |
| ----------- | ----------------- |
| `"google"`  | Google OAuth      |
| `"email"`   | Email sign-in     |
| `"discord"` | Discord OAuth     |
| `"github"`  | GitHub OAuth      |
| `"x"`       | X (Twitter) OAuth |
| `"telegram"`| Telegram OAuth    |

Calling `signIn()` opens the OS browser for the OAuth flow. On iOS and Android
fallback flows, the browser returns via your configured `redirectScheme`. On
Android with the native auth module, the browser callback is handled through the
SDK's internal callback Activity.

**Example — sign-in button component:**

```typescript
import { View, Button } from "react-native";
import { useOkoWallet } from "@oko-wallet/oko-sdk-core-react-native";

function SignInButtons() {
  const wallet = useOkoWallet();

  const handleSignIn = async (
    type: "google" | "email" | "discord" | "github" | "x" | "telegram",
  ) => {
    try {
      await wallet.signIn(type);
      // User is now signed in
    } catch (error) {
      // User cancelled or auth failed
      console.error("Sign in failed:", error);
    }
  };

  return (
    <View>
      <Button
        title="Sign in with Google"
        onPress={() => handleSignIn("google")}
      />
      <Button
        title="Sign in with Email"
        onPress={() => handleSignIn("email")}
      />
      <Button
        title="Sign in with Discord"
        onPress={() => handleSignIn("discord")}
      />
      <Button
        title="Sign in with GitHub"
        onPress={() => handleSignIn("github")}
      />
      <Button title="Sign in with X" onPress={() => handleSignIn("x")} />
      <Button
        title="Sign in with Telegram"
        onPress={() => handleSignIn("telegram")}
      />
    </View>
  );
}
```

### Sign Out

```typescript
await wallet.signOut();
```

Attempts the browser sign-out flow and clears the persisted local session from
AsyncStorage. If the browser sign-out flow fails, the local session is still
cleared.

### Session Persistence

The RN SDK automatically persists the user session via AsyncStorage. On app
restart, `waitUntilInitialized` resolves once the stored session is restored. If
the user was previously signed in, they remain signed in.

The session is automatically cleared if the `sdkEndpoint` changes between
launches (e.g., switching from production to staging).

## Wallet Information

After sign-in and initialization, retrieve wallet info using these async
methods:

```typescript
const publicKey = await wallet.getPublicKey(); // secp256k1 hex
const ed25519Key = await wallet.getPublicKeyEd25519(); // ed25519 hex
const email = await wallet.getEmail(); // user email
const name = await wallet.getName(); // display name
const walletInfo = await wallet.getWalletInfo(); // full WalletInfo object
const authType = await wallet.getAuthType(); // "google" | "discord" | ...
```

All methods return Promises. They internally await initialization, but calling
`waitUntilInitialized` first is still recommended for predictable UX.

## Transaction Signing

Use the chain-specific SDKs for signing. They accept the RN wallet instance and
handle all OS-browser transport automatically.

### Ethereum / EVM

```typescript
import { useMemo } from "react";
import { useOkoWallet } from "@oko-wallet/oko-sdk-core-react-native";
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";


function EthExample() {
  const wallet = useOkoWallet();
  const eth = useMemo(
    () => new OkoEthWallet(wallet),
    [wallet],
  );

  const signMessage = async () => {
    const address = await eth.getAddress();
    const signature = await eth.sign("Hello Oko!");
    console.log("Signed by", address, ":", signature);
  };
}
```

For full EVM API (transactions, typed data, EIP-1193 provider):
**[Ethereum Integration](../ethereum-integration)**

### Cosmos

```typescript
import { useMemo } from "react";
import { useOkoWallet } from "@oko-wallet/oko-sdk-core-react-native";
import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";


function CosmosExample() {
  const wallet = useOkoWallet();
  const cosmos = useMemo(
    () => new OkoCosmosWallet(wallet),
    [wallet],
  );

  const getAccount = async () => {
    const key = await cosmos.getKey("cosmoshub-4");
    console.log("Cosmos address:", key.bech32Address);
  };
}
```

For full Cosmos API (signDirect, signAmino, signArbitrary, sendTx):
**[Cosmos Integration](../cosmos-integration)**

### Solana

```typescript
import { useMemo } from "react";
import { useOkoWallet } from "@oko-wallet/oko-sdk-core-react-native";
import { OkoSvmWallet } from "@oko-wallet/oko-sdk-svm";


function SolanaExample() {
  const wallet = useOkoWallet();
  const svm = useMemo(
    () =>
      new OkoSvmWallet(wallet, {
        chain_id: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      }),
    [wallet],
  );

  const connect = async () => {
    await svm.connect();
    const address = svm.publicKey?.toBase58();
    console.log("Solana address:", address);
  };
}
```

For full Solana API (signMessage, signTransaction, signAndSendTransaction):
**[Solana Integration](../solana-integration)**

<!-- prettier-ignore -->
:::tip Advanced: Raw Messages
For edge cases like custom chain metadata queries, you can use
`sendMsgToIframe()` directly:

```typescript
const response = await wallet.sendMsgToIframe({
  target: "oko_sdk",
  msg_type: "get_eth_chain_info",
  payload: { chain_id: "eip155:1" },
});
```

:::

## Event Handling

Listen for account change events:

```typescript
import { useEffect } from "react";
import { useOkoWallet } from "@oko-wallet/oko-sdk-core-react-native";

function AccountListener() {
  const wallet = useOkoWallet();

  useEffect(() => {
    const handler = {
      type: "CORE__accountsChanged" as const,
      handler: (payload: {
        authType: string | null;
        email: string | null;
        publicKey: string | null;
        name: string | null;
      }) => {
        console.log("Account changed:", payload.publicKey, payload.email);
      },
    };

    wallet.on(handler);
    return () => wallet.off(handler);
  }, [wallet]);
}
```

The `on()` / `off()` methods accept an `OkoWalletCoreEventHandler2` object with
a `type` discriminator and a `handler` callback — not a plain function.

**Available events:**

| Event                    | Payload                                      | Fired when                    |
| ------------------------ | -------------------------------------------- | ----------------------------- |
| `CORE__accountsChanged`  | `{ authType, email, publicKey, name }` | Active account changes or user signs in/out |

## Unsupported Features

The following web SDK methods are not available in the React Native SDK:

| Method                   | Status         | Alternative                                                                  |
| ------------------------ | -------------- | ---------------------------------------------------------------------------- |
| `openSignInModal()`      | Throws error   | Build a custom provider selection UI and call `signIn(type)` directly        |
| `startEmailSignIn()`     | Not supported  | Use `signIn("email")` instead                                                |
| `completeEmailSignIn()`  | Not supported  | Use `signIn("email")` instead                                                |
| `closeModal()`           | No-op          | The OS browser closes itself after completing the operation                  |

## sdkEndpoint for Self-Hosted Deployments

If you run a self-hosted Oko deployment, set the `sdkEndpoint` prop to your
`attached_mobile_host_web` URL:

```typescript
<OkoWalletProvider
  apiKey="your-api-key"
  sdkEndpoint="https://mobile.your-domain.com"
>
  <YourApp />
</OkoWalletProvider>
```

Default: `https://mobile.oko.app`

## Troubleshooting

### "Install either expo-web-browser or react-native-inappbrowser-reborn"

You are missing a browser dependency. Install one of the two supported packages
(see [Installation](#browser-dependency-one-required) above).

### Deep link not returning to app

For iOS and Android fallback flows, the `redirectScheme` passed to
`OkoWalletProvider` must match the URL scheme registered in your native app. On
Android with the native auth module, also verify the SDK callback Activities are
present. See **[Platform Setup](./react-native-platform-setup)** for details.

### Session lost after app restart

Ensure `@react-native-async-storage/async-storage` is installed and properly
linked. For bare RN projects, run `cd ios && pod install`.

### OS browser shows error page

Check that `sdkEndpoint` is correct and the `attached_mobile_host_web` service
is running at that URL.

## Next Steps

- **[React Native Platform Setup](./react-native-platform-setup)** — Expo
  config plugin and deep link configuration
- **[Ethereum Integration](../ethereum-integration)** — Full EVM signing API
  (works with RN wallet via `OkoEthWallet`)
- **[Cosmos Integration](../cosmos-integration)** — Full Cosmos signing API
  (works with RN wallet via `OkoCosmosWallet`)
- **[Solana Integration](../solana-integration)** — Full Solana signing API
  (works with RN wallet via `OkoSvmWallet`)
- **[Error Handling](../error-handling)** — Error handling patterns
