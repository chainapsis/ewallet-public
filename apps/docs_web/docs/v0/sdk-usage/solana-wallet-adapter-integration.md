---
title: Solana Wallet Adapter Integration
sidebar_position: 7
---

# Solana Wallet Adapter Integration

Integrate Oko with Solana's
[`@solana/wallet-adapter-react`](https://github.com/anza-xyz/wallet-adapter)
for React-based Solana dApps.

<!-- prettier-ignore -->
:::tip How it works
Oko registers itself via the [Wallet Standard](https://github.com/anza-xyz/wallet-standard) protocol. Once registered, Solana Wallet Adapter **auto-discovers** Oko — no manual wallet configuration needed.
:::

## Installation

```bash
npm install @oko-wallet/oko-sdk-svm @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-base @solana/web3.js @solana/wallet-standard-chains @solana/wallet-standard-features
```

## Step 1: Register Oko as a Wallet Standard Wallet

Initialize `OkoSvmWallet` and register it with the wallet-standard protocol.
This should run **once** at app startup, before rendering wallet UI.

```typescript
import {
  OkoSvmWallet,
  registerWalletStandard,
  type WalletStandardConfig,
} from "@oko-wallet/oko-sdk-svm";
import {
  SOLANA_CHAINS,
  SOLANA_MAINNET_CHAIN,
  SOLANA_DEVNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
} from "@solana/wallet-standard-chains";
import {
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
  SolanaSignAndSendTransaction,
} from "@solana/wallet-standard-features";

const SOLANA_CONFIG: WalletStandardConfig = {
  chains: SOLANA_CHAINS,
  features: {
    signIn: SolanaSignIn,
    signMessage: SolanaSignMessage,
    signTransaction: SolanaSignTransaction,
    signAndSendTransaction: SolanaSignAndSendTransaction,
  },
  rpcEndpoints: {
    [SOLANA_MAINNET_CHAIN]: "https://api.mainnet-beta.solana.com",
    [SOLANA_DEVNET_CHAIN]: "https://api.devnet.solana.com",
    [SOLANA_TESTNET_CHAIN]: "https://api.testnet.solana.com",
  },
};

const result = OkoSvmWallet.init({
  api_key: "your-api-key",
  chain_id: SOLANA_DEVNET_CHAIN,
  theme: "dark",
});

if (!result.success) {
  throw new Error(`Failed to initialize: ${JSON.stringify(result.err)}`);
}

// Register with wallet-standard (call once globally)
registerWalletStandard(result.data, [SOLANA_CONFIG]);

// Wait for SDK initialization to complete
await result.data.waitUntilInitialized;
```

## Step 2: Set Up Wallet Adapter Providers

Wrap your app with Solana Wallet Adapter providers. Pass an **empty** `wallets`
array — wallet-standard wallets like Oko are discovered automatically.

```tsx
import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletAdapterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  // No wallets array needed - wallet-standard wallets are auto-discovered
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

## Step 3: Use Wallet Adapter Hooks

With the providers set up, use the standard Wallet Adapter hooks and UI
components. Oko will appear as a selectable wallet in the modal.

```tsx
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  WalletDisconnectButton,
} from "@solana/wallet-adapter-react-ui";

function WalletContent() {
  const { publicKey, connected, wallet, wallets } = useWallet();

  return (
    <div>
      {/* Wallet selection modal button */}
      <WalletMultiButton />
      {connected && <WalletDisconnectButton />}

      {/* Connection status */}
      <p>Connected: {connected ? "Yes" : "No"}</p>
      <p>Wallet: {wallet?.adapter.name ?? "None"}</p>
      <p>Public Key: {publicKey?.toBase58()}</p>

      {/* List all discovered wallets */}
      <ul>
        {wallets.map((w) => (
          <li key={w.adapter.name}>
            {w.adapter.name} ({w.readyState})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Supported Features

| Feature                         | Description                     |
| ------------------------------- | ------------------------------- |
| `standard:connect`              | Connect to wallet               |
| `standard:disconnect`           | Disconnect from wallet          |
| `standard:events`               | Subscribe to wallet events      |
| `solana:signIn`                 | Sign In With Solana (SIWS)      |
| `solana:signMessage`            | Sign arbitrary messages         |
| `solana:signTransaction`        | Sign transactions               |
| `solana:signAndSendTransaction` | Sign and broadcast transactions |

## Next Steps

- **[Solana Integration](./solana-integration)** - Direct SDK usage without
  Wallet Adapter
- **[React Integration](./react-integration)** - General React patterns
- **[Error Handling](./error-handling)** - Error handling best practices
