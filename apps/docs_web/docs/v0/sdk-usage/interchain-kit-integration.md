---
title: Interchain Kit Integration
sidebar_position: 10
---

# Interchain Kit Integration

:::warning Beta Feature This integration is currently in beta. APIs may change
in future releases. EVM chain connections are not yet supported. :::

Learn how to integrate Oko Wallet with Interchain Kit, the multi-chain wallet
adapter for Cosmos ecosystem applications.

<!-- prettier-ignore -->
:::tip Get started faster
Prefer a ready-to-run example? Try the **[Interchain Kit (Next.js) starter template](https://github.com/chainapsis/oko/tree/main/examples/interchainkit_nextjs)**.
:::

## Overview

`@oko-wallet/oko-interchain-kit` is an Interchain Kit wallet connector that
enables your application to use Oko Wallet alongside other Cosmos wallets. This
integration provides a seamless embedded wallet experience while maintaining
compatibility with the Interchain Kit ecosystem.

## Installation

Install the required packages:

```bash
npm install @oko-wallet/oko-interchain-kit @interchain-kit/react @interchain-kit/core
```

## Basic Setup

### 1. Create Oko Wallet

Use `makeOkoWallet` to create a wallet instance:

```typescript
import { makeOkoWallet } from "@oko-wallet/oko-interchain-kit";

const okoWallet = makeOkoWallet({
  apiKey: "your-oko-api-key",
  sdkEndpoint: "https://your-custom-oko-sdk.example.com", // optional, Only specify if you have your own SDK endpoint
});
```

### 2. Configure ChainProvider

Wrap your application with Interchain Kit's `ChainProvider` and include the Oko
wallets:

```typescript
import { ChainProvider } from "@interchain-kit/react";
import { makeOkoWallet } from "@oko-wallet/oko-interchain-kit";
import { chains, assetLists } from "@chain-registry/v2";

const okoWallet = makeOkoWallet({
  apiKey: "your-oko-api-key",
});

export default function App({ Component, pageProps }) {
  return (
    <ChainProvider
      chains={chains}
      assetLists={assetLists}
      wallets={[okoWallet]}
    >
      <Component {...pageProps} />
    </ChainProvider>
  );
}
```

### 3. Connect to Oko Wallet

Use the standard Interchain Kit hooks to interact with Oko Wallet:

```typescript
import { useChain } from "@interchain-kit/react";
import { WalletState } from "@interchain-kit/core";

function WalletConnect() {
  const { openView, disconnect, address, status } = useChain("osmosis");

  return (
    <div>
      {status === WalletState.Connected ? (
        <div>
          <p>Connected: {address}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={openView}>Connect</button>
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

## Signing Transactions

Interchain Kit provides the `wallet` object for signing transactions:

```typescript
import { useChain } from "@interchain-kit/react";
import { SigningStargateClient } from "@cosmjs/stargate";

function SendTransaction() {
  const { address, wallet, getRpcEndpoint } = useChain("osmosis");

  const sendTokens = async () => {
    const offlineSigner = await wallet?.getOfflineSigner();
    if (!offlineSigner || !address) return;

    const rpcEndpoint = await getRpcEndpoint();
    const client = await SigningStargateClient.connectWithSigner(
      rpcEndpoint,
      offlineSigner,
    );

    const result = await client.sendTokens(
      address,
      "osmo1recipientaddress",
      [{ denom: "uosmo", amount: "1000" }],
      "auto",
    );

    console.log("Transaction hash:", result.transactionHash);
  };

  return <button onClick={sendTokens}>Send Tokens</button>;
}
```

## Next Steps

- **[Cosmos Integration](./cosmos-integration)** - Learn about direct Oko Cosmos
  SDK usage
- **[Error Handling](./error-handling)** - Handle errors gracefully
- **[React Integration](./react-integration)** - React-specific patterns

## Resources

- [Interchain Kit Documentation](https://github.com/cosmology-tech/interchain-kit)
- [Example Application](https://github.com/chainapsis/oko/tree/main/examples/interchainkit_nextjs)
- [Chain Registry](https://github.com/cosmos/chain-registry)
