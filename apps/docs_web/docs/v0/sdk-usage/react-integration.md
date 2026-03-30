---
title: React Integration
sidebar_position: 5
---

# React Integration

Complete guide for integrating Oko into React applications.

<!-- prettier-ignore -->
:::tip Get started faster
Prefer a ready-to-run example? Try the **[Cosmos + EVM + SVM (React) starter template](https://github.com/chainapsis/oko/tree/main/examples/multi_ecosystem_react)**.
:::

## Provider Setup

`@oko-wallet/oko-sdk-react` ships a ready-made `OkoProvider` that initializes
the core wallet and every chain SDK you enable. Wrap your app with it instead of
managing state manually:

```typescript
import { OkoProvider } from "@oko-wallet/oko-sdk-react";

// Enable only the ecosystems you need.
// Each chain SDK is lazily imported — unused ones are never bundled.
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

### `useOko` Hook

Access core wallet state and actions from any component inside `OkoProvider`:

```typescript
import { useOko } from "@oko-wallet/oko-sdk-react";

const {
  wallet,          // OkoWalletInterface | null
  isReady,         // true once the core SDK is fully initialized
  isSignedIn,      // true when a user session is active
  authType,        // current auth provider (e.g. "google", "email")
  email,           // signed-in user's email
  name,            // signed-in user's display name
  publicKey,       // signed-in user's public key
  signIn,          // (type: SignInType) => Promise<void>
  signOut,         // () => Promise<void>
  openSignInModal, // () => Promise<void>  — opens the Oko sign-in UI
  setTheme,        // (theme: "light" | "dark") => Promise<void>
} = useOko();
```

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

## App Setup

```typescript
// App.tsx
import { OkoProvider } from "@oko-wallet/oko-sdk-react";
import { ConnectWalletButton } from "./components/ConnectWalletButton";
import { TransactionWidget } from "./components/TransactionWidget";

const okoConfig = {
  apiKey: "YOUR_API_KEY",
  theme: "dark" as const,
  eth: true,
};

function App() {
  return (
    <OkoProvider config={okoConfig}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-8">
            Oko Demo
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
              <ConnectWalletButton />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Send Transaction</h2>
              <TransactionWidget />
            </div>
          </div>
        </div>
      </div>
    </OkoProvider>
  );
}

export default App;
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

- **[Cosmos Integration](./cosmos-integration)** - Cosmos setup
- **[Ethereum Integration](./ethereum-integration)** - Ethereum setup
- **[SVM Integration](./solana-integration)** - SVM setup (Solana, etc.)
- **[RainbowKit Integration](./rainbow-kit-integration)** - RainbowKit
  integration
- **[Error Handling](./error-handling)** - Error handling patterns
- **[React Native Integration](./mobile/react-native-integration)** - Building a
  mobile app? See the React Native guide
