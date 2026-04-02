---
title: Cosmos Kit Integration
sidebar_position: 9
---

# Cosmos Kit Integration

Learn how to integrate Oko Wallet with Cosmos Kit, the popular wallet adapter
for Cosmos ecosystem applications.

<!-- prettier-ignore -->
:::tip Get started faster
Prefer a ready-to-run example? Try the **[Cosmos Kit (Next.js) starter template](https://github.com/chainapsis/oko/tree/main/examples/cosmos-kit-nextjs)**.
:::

## Overview

`@oko-wallet/oko-cosmos-kit` is a Cosmos Kit wallet connector that enables your
application to use Oko Wallet alongside other Cosmos wallets. This integration
provides a seamless embedded wallet experience while maintaining compatibility
with the Cosmos Kit ecosystem.

## Installation

Install the required packages:

```bash
npm install @oko-wallet/oko-cosmos-kit @cosmos-kit/react @cosmos-kit/core
```

You'll also need the CosmJS peer dependencies:

```bash
npm install @cosmjs/amino @cosmjs/proto-signing
```

## Basic Setup

### 1. Create Oko Wallet

Use `makeOkoWallet` to create a wallet instance:

```typescript
import { makeOkoWallet } from "@oko-wallet/oko-cosmos-kit";

const okoWallet = makeOkoWallet({
  apiKey: "your-oko-api-key",
  sdkEndpoint: "https://your-custom-oko-sdk.example.com", // optional, Only specify if you have your own SDK endpoint
});
```

### 2. Configure ChainProvider

Wrap your application with Cosmos Kit's `ChainProvider` and include the Oko
wallets:

```typescript
import { ChainProvider } from "@cosmos-kit/react";
import { makeOkoWallet } from "@oko-wallet/oko-cosmos-kit";
import { chains, assets } from "chain-registry";

const okoWallet = makeOkoWallet({
  apiKey: "your-oko-api-key",
});

export default function App({ Component, pageProps }) {
  return (
    <ChainProvider
      chains={chains}
      assetLists={assets}
      wallets={[okoWallet]}
    >
      <Component {...pageProps} />
    </ChainProvider>
  );
}
```

### 3. Connect to Oko Wallet

Use the standard Cosmos Kit hooks to interact with Oko Wallet:

```typescript
import { useChain } from "@cosmos-kit/react";

function WalletConnect() {
  const { connect, disconnect, address, status, wallet } = useChain(
    "cosmoshub",
  );

  const connectOko = async () => {
    await connect();
  };

  return (
    <div>
      {status === "Connected" ? (
        <div>
          <p>Connected: {address}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connectOko}>Connect</button>
      )}
    </div>
  );
}
```

## Configuration Options

### OkoWalletOptions

The `makeOkoWallet` function accepts the following options:

```typescript
interface OkoWalletOptions {
  // Your Oko API key (required)
  apiKey: string;

  // Custom SDK endpoint (optional)
  // Defaults to Oko's production endpoint
  sdkEndpoint?: string;
}
```

### Login Providers

When connecting, users can select their preferred login provider from a modal:

- Google OAuth
- Email/passwordless
- X (Twitter) OAuth
- Discord OAuth
- Telegram OAuth

## Next Steps

- **[Cosmos Integration](./cosmos-integration)** - Learn about direct Oko Cosmos
  SDK usage
- **[Error Handling](./error-handling)** - Handle errors gracefully
- **[React Integration](./react-integration)** - React-specific patterns

## Resources

- [Cosmos Kit Documentation](https://docs.hyperweb.io/cosmos-kit)
- [Example Application](https://github.com/chainapsis/oko/tree/main/examples/cosmos-kit-nextjs)
- [Chain Registry](https://github.com/cosmos/chain-registry)
