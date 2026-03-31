---
title: React Integration
sidebar_position: 2
---

# React Integration

Complete guide for integrating Oko into React applications. `@oko-wallet/oko-sdk-react`
provides ready-to-use hooks — no manual context setup needed.

<!-- prettier-ignore -->
:::tip Get started faster
Prefer a ready-to-run example? Try the **[Cosmos + EVM + SVM (React) starter template](https://github.com/chainapsis/oko/tree/main/examples/multi_ecosystem_react)**.
:::

## Installation

```bash
npm install @oko-wallet/oko-sdk-react
```

All chain SDKs (EVM, Cosmos, Solana) are included as dependencies.

## Provider Setup

Wrap your app with `OkoProvider`. Only configured chains are initialized —
unused ones are never bundled.

```typescript
import { OkoProvider } from "@oko-wallet/oko-sdk-react";

const okoConfig = {
  apiKey: "YOUR_API_KEY",
  theme: "dark" as const,
  eth: true,
  cosmos: true,
  svm: { chainId: "solana:mainnet" },
};

export default function App({ children }: { children: React.ReactNode }) {
  return <OkoProvider config={okoConfig}>{children}</OkoProvider>;
}
```

### `OkoProviderConfig`

| Property      | Type                         | Required | Description                                                     |
| ------------- | ---------------------------- | -------- | --------------------------------------------------------------- |
| `apiKey`      | `string`                     | Yes      | Your Oko API key                                                |
| `sdkEndpoint` | `string`                     | No       | Custom SDK endpoint URL                                         |
| `theme`       | `"light" \| "dark"`          | No       | Initial theme for the wallet UI                                 |
| `eth`         | `boolean \| OkoEthConfig`    | No       | Enable Ethereum/EVM chain support                               |
| `cosmos`      | `boolean \| OkoCosmosConfig` | No       | Enable Cosmos chain support                                     |
| `svm`         | `boolean \| OkoSvmConfig`    | No       | Enable Solana/SVM support (`true` defaults to `solana:mainnet`) |

## `useOko`

Core hook for authentication and wallet state.

```tsx
import { useOko } from "@oko-wallet/oko-sdk-react";

function ConnectButton() {
  const { isReady, isSignedIn, signOut, openSignInModal, email, name } = useOko();

  if (!isReady) {
    return <p>Loading...</p>;
  }

  if (isSignedIn) {
    return (
      <div>
        <p>Signed in as {email}</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  return <button onClick={openSignInModal}>Sign In</button>;
}
```

### Return Values

| Property          | Type                                       | Description                                           |
| ----------------- | ------------------------------------------ | ----------------------------------------------------- |
| `wallet`          | `OkoWalletInterface \| null`               | Raw SDK instance for advanced usage                   |
| `isReady`         | `boolean`                                  | SDK fully initialized and usable                      |
| `isSignedIn`      | `boolean`                                  | User is authenticated                                 |
| `authType`        | `AuthType \| null`                         | Auth provider (`"google"`, `"x"`, `"discord"`, etc.)  |
| `email`           | `string \| null`                           | User email                                            |
| `name`            | `string \| null`                           | User display name                                     |
| `publicKey`       | `string \| null`                           | secp256k1 public key                                  |
| `signIn`          | `(type: SignInType) => Promise<void>`      | Start sign-in flow                                    |
| `signOut`         | `() => Promise<void>`                      | Sign out current user                                 |
| `openSignInModal` | `() => Promise<void>`                      | Open built-in provider picker UI                      |
| `setTheme`        | `(theme: OkoWalletTheme) => Promise<void>` | Update the wallet theme                               |

### `SignInType`

Supported providers: `"google"`, `"email"`, `"x"`, `"telegram"`, `"discord"`,
`"github"`

## Chain Hooks

Chain hooks are imported from subpath exports. Each returns the chain SDK
instance and initialization status.

### `useOkoEth`

```tsx
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";

function EthPanel() {
  const { ethWallet, isReady, address } = useOkoEth();

  if (!isReady || !ethWallet) return null;

  return <p>ETH Address: {address}</p>;
}
```

| Property        | Type                            | Description                                       |
| --------------- | ------------------------------- | ------------------------------------------------- |
| `ethWallet`     | `OkoEthWalletInterface \| null` | ETH SDK instance                                  |
| `isInitialized` | `boolean`                       | `init()` succeeded                                |
| `isReady`       | `boolean`                       | Fully initialized and usable                      |
| `address`       | `string \| null`                | EVM address (`0x...`), same across all EVM chains |

### `useOkoCosmos`

```tsx
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";

function CosmosPanel() {
  const { cosmosWallet, isReady } = useOkoCosmos();

  if (!isReady || !cosmosWallet) return null;

  const signer = cosmosWallet.getOfflineSigner("cosmoshub-4");
}
```

| Property        | Type                               | Description                  |
| --------------- | ---------------------------------- | ---------------------------- |
| `cosmosWallet`  | `OkoCosmosWalletInterface \| null` | Cosmos SDK instance          |
| `isInitialized` | `boolean`                          | `init()` succeeded           |
| `isReady`       | `boolean`                          | Fully initialized and usable |

### `useCosmosAddress`

Cosmos addresses vary by chain (different bech32 prefixes), so use this hook
with a specific chain ID.

```tsx
import { useCosmosAddress } from "@oko-wallet/oko-sdk-react/cosmos";

function CosmosAddress() {
  const { address, isLoading } = useCosmosAddress("cosmoshub-4");

  if (isLoading) return <p>Loading...</p>;

  return <p>Cosmos Address: {address}</p>;
}
```

| Property    | Type             | Description                                                        |
| ----------- | ---------------- | ------------------------------------------------------------------ |
| `address`   | `string \| null` | Bech32 address for the given chain (e.g. `cosmos1...`, `osmo1...`) |
| `isLoading` | `boolean`        | Address is being resolved                                          |

### `useOkoSvm`

```tsx
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";

function SolanaPanel() {
  const { svmWallet, isReady, address } = useOkoSvm();

  if (!isReady || !svmWallet) return null;

  return <p>Solana Address: {address}</p>;
}
```

| Property        | Type                            | Description                                            |
| --------------- | ------------------------------- | ------------------------------------------------------ |
| `svmWallet`     | `OkoSvmWalletInterface \| null` | SVM SDK instance                                       |
| `isInitialized` | `boolean`                       | `init()` succeeded                                     |
| `isReady`       | `boolean`                       | Fully initialized and usable                           |
| `address`       | `string \| null`                | Solana base58 address, same across all Solana clusters |

## Components

### Connect Button

```typescript
// components/ConnectWalletButton.tsx
import { useOko } from "@oko-wallet/oko-sdk-react";

export const ConnectWalletButton = () => {
  const { isReady, isSignedIn, openSignInModal, signOut } = useOko();

  if (!isReady) {
    return null;
  }

  if (isSignedIn) {
    return (
      <button onClick={signOut} className="px-4 py-2 bg-gray-500 text-white rounded">
        Disconnect
      </button>
    );
  }

  return (
    <button onClick={openSignInModal} className="px-4 py-2 bg-red-500 text-white rounded">
      Connect
    </button>
  );
};
```

### Transaction Widget

```typescript
// components/TransactionWidget.tsx
import { useState } from "react";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";

export const TransactionWidget = () => {
  const { ethWallet, isReady } = useOkoEth();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ethWallet || !isReady) {
      return;
    }

    try {
      const provider = await ethWallet.getEthereumProvider();

      await provider.request({
        method: "eth_sendTransaction",
        params: [{
          to: recipient,
          value: `0x${parseInt(amount).toString(16)}`,
          gas: "0x5208",
        }],
      });
      setRecipient("");
      setAmount("");
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient address"
        className="w-full border rounded px-3 py-2"
        required
      />
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (ETH)"
        step="0.001"
        className="w-full border rounded px-3 py-2"
        required
      />
      <button
        type="submit"
        className="w-full px-4 py-2 bg-green-500 text-white rounded"
      >
        Send Transaction
      </button>
    </form>
  );
};
```

## Full Example

```tsx
import { OkoProvider, useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { useCosmosAddress } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";

function Wallet() {
  const { isReady, isSignedIn, signOut, openSignInModal, email, name } = useOko();
  const { address: ethAddress } = useOkoEth();
  const { address: cosmosAddress } = useCosmosAddress("cosmoshub-4");
  const { address: svmAddress } = useOkoSvm();

  if (!isReady) return <p>Initializing...</p>;

  if (!isSignedIn) {
    return <button onClick={openSignInModal}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome, {name || email}</p>
      <p>ETH: {ethAddress}</p>
      <p>Cosmos: {cosmosAddress}</p>
      <p>Solana: {svmAddress}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}

export default function App() {
  return (
    <OkoProvider
      config={{
        apiKey: "your-api-key",
        eth: true,
        cosmos: true,
        svm: { chainId: "solana:mainnet" },
      }}
    >
      <Wallet />
    </OkoProvider>
  );
}
```

## Runtime Theme Switching

If your app supports dark mode, sync the theme with Oko at runtime using the
`setTheme` function from the `useOko` hook:

```typescript
// hooks/useThemeSync.ts
import { useEffect } from "react";
import { useOko } from "@oko-wallet/oko-sdk-react";

export function useThemeSync(theme: "light" | "dark") {
  const { isReady, setTheme } = useOko();

  useEffect(() => {
    if (!isReady) return;
    setTheme(theme);
  }, [theme, isReady, setTheme]);
}
```

## Next Steps

- **[Ethereum Integration](./ethereum-integration)** — EVM signing and
  transactions
- **[Cosmos Integration](./cosmos-integration)** — Cosmos signing and key
  management
- **[Solana Integration](./solana-integration)** — Solana Wallet Standard
- **[RainbowKit Integration](./rainbow-kit-integration)** — RainbowKit
  integration
- **[Error Handling](./error-handling)** — Error handling patterns
- **[React Native Integration](./mobile/react-native-integration)** — Building a
  mobile app? See the React Native guide
