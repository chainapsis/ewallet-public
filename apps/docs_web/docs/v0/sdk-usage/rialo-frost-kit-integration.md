---
title: Rialo Frost Kit Integration
sidebar_position: 7
draft: true
---

# Rialo Frost Kit Integration

Integrate Oko with [Rialo Frost](https://rialo.com), the wallet adapter
framework for Rialo dApps.

<!-- prettier-ignore -->
:::tip How it works
Oko registers as a wallet-standard wallet with Rialo-specific chain identifiers and features. Frost auto-discovers Oko and provides React hooks for wallet interactions.
:::

## Installation

```bash
npm install @oko-wallet/oko-sdk-svm @rialo/frost @rialo/ts-cdk @rialo/wallet-standard
```

## Step 1: Create Frost Config

Configure the Frost client with your target Rialo network.

```typescript
import { createConfig, getDefaultRialoClientConfig } from "@rialo/frost";

export const frostConfig = createConfig({
  clientConfig: getDefaultRialoClientConfig("devnet"),
  autoConnect: true,
});
```

## Step 2: Register Oko for Rialo

Initialize `OkoSvmWallet` with Rialo chain identifiers and register it with the
wallet-standard protocol using Rialo-specific features.

```typescript
import {
  OkoSvmWallet,
  registerWalletStandard,
  type WalletStandardConfig,
} from "@oko-wallet/oko-sdk-svm";
import {
  RIALO_CHAINS,
  RIALO_DEVNET_CHAIN,
  RIALO_TESTNET_CHAIN,
  RialoSignMessage,
  RialoSignTransaction,
  RialoSignAndSendTransaction,
} from "@rialo/wallet-standard";
import type { IdentifierString } from "@wallet-standard/base";

const RIALO_CONFIG: WalletStandardConfig = {
  chains: RIALO_CHAINS,
  features: {
    signIn: "rialo:signIn" as IdentifierString,
    signMessage: RialoSignMessage,
    signTransaction: RialoSignTransaction,
    signAndSendTransaction: RialoSignAndSendTransaction,
  },
  rpcEndpoints: {
    [RIALO_DEVNET_CHAIN]: "https://api.devnet.rialo.io",
    [RIALO_TESTNET_CHAIN]: "https://api.testnet.rialo.io",
  },
};

const result = OkoSvmWallet.init({
  api_key: "your-api-key",
  chain_id: RIALO_DEVNET_CHAIN,
  theme: "dark",
});

if (!result.success) {
  throw new Error(`Failed to initialize: ${JSON.stringify(result.err)}`);
}

registerWalletStandard(result.data, [RIALO_CONFIG]);

await result.data.waitUntilInitialized;
```

## Step 3: Set Up FrostProvider

Wrap your app with `FrostProvider`. The initialization from Step 2 should run
before the provider renders (e.g., in a parent component's `useEffect`).

```tsx
import { FrostProvider } from "@rialo/frost";
import { frostConfig } from "./frost-config";

function App({ children }: { children: React.ReactNode }) {
  return <FrostProvider config={frostConfig}>{children}</FrostProvider>;
}
```

### Full Provider Example

A complete provider component that handles Oko initialization and Frost setup:

```tsx
"use client";

import {
  OkoSvmWallet,
  registerWalletStandard,
  type WalletStandardConfig,
} from "@oko-wallet/oko-sdk-svm";
import { FrostProvider } from "@rialo/frost";
import {
  RIALO_CHAINS,
  RIALO_DEVNET_CHAIN,
  RIALO_TESTNET_CHAIN,
  RialoSignAndSendTransaction,
  RialoSignMessage,
  RialoSignTransaction,
} from "@rialo/wallet-standard";
import type { IdentifierString } from "@wallet-standard/base";
import { type ReactNode, useEffect, useState } from "react";

import { frostConfig } from "./frost-config";

const RIALO_CONFIG: WalletStandardConfig = {
  chains: RIALO_CHAINS,
  features: {
    signIn: "rialo:signIn" as IdentifierString,
    signMessage: RialoSignMessage,
    signTransaction: RialoSignTransaction,
    signAndSendTransaction: RialoSignAndSendTransaction,
  },
  rpcEndpoints: {
    [RIALO_DEVNET_CHAIN]: "https://api.devnet.rialo.io",
    [RIALO_TESTNET_CHAIN]: "https://api.testnet.rialo.io",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initWallet = async () => {
      try {
        const result = OkoSvmWallet.init({
          api_key: process.env.NEXT_PUBLIC_OKO_API_KEY!,
          sdk_endpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT,
          chain_id: RIALO_DEVNET_CHAIN,
          theme: "dark",
        });

        if (!result.success) {
          throw new Error(
            `Failed to initialize: ${JSON.stringify(result.err)}`,
          );
        }

        registerWalletStandard(result.data, [RIALO_CONFIG]);
        await result.data.waitUntilInitialized;
      } catch (err) {
        console.error("Failed to initialize Oko wallet:", err);
      }
      setIsReady(true);
    };

    initWallet();
  }, []);

  if (!isReady) {
    return <div>Initializing wallet...</div>;
  }

  return <FrostProvider config={frostConfig}>{children}</FrostProvider>;
}
```

## Step 4: Use Frost Hooks

### Connect Button

Frost provides a pre-built `ConnectButton` component:

```tsx
import { ConnectButton } from "@rialo/frost";

function Header() {
  return (
    <nav>
      <ConnectButton />
    </nav>
  );
}
```

### Account Info

```tsx
import { useIsConnected, useActiveAccount, useNativeBalance } from "@rialo/frost";

function AccountInfo() {
  const isConnected = useIsConnected();
  const activeAccount = useActiveAccount();
  const { balance, isLoading, refetch } = useNativeBalance();

  if (!isConnected) return <p>Not connected</p>;

  return (
    <div>
      <p>Address: {activeAccount?.address}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Sign Message

```tsx
import { useSignMessage } from "@rialo/frost";
import bs58 from "bs58";

function SignMessageButton() {
  const { mutate: signMessage, isPending } = useSignMessage();

  const handleSign = () => {
    signMessage(
      { message: "Hello, Rialo!" },
      {
        onSuccess: (result) => {
          console.log("Signature:", bs58.encode(result.signature));
        },
        onError: (err) => {
          console.error("Failed to sign:", err);
        },
      },
    );
  };

  return (
    <button onClick={handleSign} disabled={isPending}>
      Sign Message
    </button>
  );
}
```

### Send Transaction

Build and send transactions using `@rialo/ts-cdk`:

```tsx
import { useActiveAccount, useSignAndSendTransaction } from "@rialo/frost";
import {
  PublicKey,
  TransactionBuilder,
  transferInstruction,
} from "@rialo/ts-cdk";

function SendTransaction() {
  const activeAccount = useActiveAccount();
  const { mutate: signAndSendTransaction, isPending } =
    useSignAndSendTransaction();

  const handleSend = () => {
    if (!activeAccount?.address) return;

    const fromPubkey = PublicKey.fromString(activeAccount.address);
    const toPubkey = PublicKey.fromString("RECIPIENT_ADDRESS");
    const kelvins = BigInt(Math.floor(0.001 * 1_000_000_000));
    const validFrom = BigInt(Date.now());

    const transaction = TransactionBuilder.create()
      .setPayer(fromPubkey)
      .setValidFrom(validFrom)
      .addInstruction(
        transferInstruction(fromPubkey, toPubkey, kelvins),
      )
      .build();

    signAndSendTransaction(
      { transaction },
      {
        onSuccess: (result) => {
          console.log("Transaction sent:", result.signature);
        },
        onError: (err) => {
          console.error("Failed to send:", err);
        },
      },
    );
  };

  return (
    <button onClick={handleSend} disabled={isPending}>
      Send 0.001 RIALO
    </button>
  );
}
```

## Supported Features

| Feature                          | Description                     |
| -------------------------------- | ------------------------------- |
| `standard:connect`               | Connect to wallet               |
| `standard:disconnect`            | Disconnect from wallet          |
| `standard:events`                | Subscribe to wallet events      |
| `rialo:signMessage`              | Sign arbitrary messages         |
| `rialo:signTransaction`          | Sign transactions               |
| `rialo:signAndSendTransaction`   | Sign and broadcast transactions |

## Frost Hooks Reference

| Hook                        | Description                    |
| --------------------------- | ------------------------------ |
| `useWallets()`              | All discovered wallets         |
| `useConnectWallet()`        | Connect to a wallet            |
| `useDisconnectWallet()`     | Disconnect current wallet      |
| `useIsConnected()`          | Connection status              |
| `useActiveAccount()`        | Currently active account       |
| `useNativeBalance()`        | Native token balance           |
| `useSignMessage()`          | Sign arbitrary messages        |
| `useSendTransaction()`      | Sign and send via wallet       |

## Next Steps

- **[Solana Integration](./solana-integration)** - Direct Solana SDK usage
- **[Solana Wallet Adapter](./solana-wallet-adapter-integration)** - Solana
  Wallet Adapter integration
- **[React Integration](./react-integration)** - General React patterns
- **[Error Handling](./error-handling)** - Error handling best practices
