---
title: Cosmos Integration
sidebar_position: 3
---

# Cosmos Integration

Complete guide for integrating Oko with the Cosmos ecosystem.

<!-- prettier-ignore -->
:::tip Get started faster
Prefer a ready-to-run example? Try the **[Cosmos (Next.js) starter template](https://github.com/chainapsis/oko/tree/main/examples/cosmos-nextjs)**.  
:::

## Installation

```bash
npm install @oko-wallet/oko-sdk-cosmos
```

## Basic Setup

```typescript
import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";

const initRes = OkoCosmosWallet.init({
  api_key: "your-api-key",
  theme: "dark",
});

if (!initRes.success) {
  throw new Error(`Cosmos wallet initialization failed: ${initRes.err}`);
}

const cosmosWallet = initRes.data;
```

## Account Management

```typescript
// Get all accounts
const accounts = await cosmosWallet.getAccounts();

// Get account by chain
const cosmosAccount = await cosmosWallet.getKey("cosmoshub-4");
const osmosisAccount = await cosmosWallet.getKey("osmosis-1");
```

## On-chain Signing

### Direct Signing

```typescript
const directSignDoc = makeSignDoc(
  bodyBytes,
  authInfoBytes,
  "cosmoshub-4",
  1234,
);

const { signed, signature } = await cosmosWallet.signDirect(
  "cosmoshub-4",
  senderAddress,
  directSignDoc,
);
```

### Amino Signing

```typescript
const aminoSignDoc = {
  chain_id: "cosmoshub-4",
  account_number: "1234",
  sequence: "0",
  fee: {
    amount: [{ denom: "uatom", amount: "1000" }],
    gas: "200000",
  },
  msgs: [
    {
      type: "cosmos-sdk/MsgSend",
      value: {
        from_address: "cosmos1...",
        to_address: "cosmos1...",
        amount: [{ denom: "uatom", amount: "1000000" }],
      },
    },
  ],
  memo: "",
};

const { signed, signature } = await cosmosWallet.signAmino(
  "cosmoshub-4",
  senderAddress,
  aminoSignDoc,
);
```

## Off-chain Signing

### Arbitrary Signing

```typescript
const signature = await cosmosWallet.signArbitrary(
  "cosmoshub-4",
  senderAddress,
  "Welcome to Oko! 🚀",
);
```

## CosmJS Integration

```typescript
import { SigningStargateClient } from "@cosmjs/stargate";

// Get offline signer
const rpcEndpoint = "https://rpc-cosmoshub.keplr.app";
const directSigner = cosmosWallet.getOfflineSigner("cosmoshub-4");

// Connect with CosmJS
const client = await SigningStargateClient.connectWithSigner(
  rpcEndpoint,
  directSigner,
);

// Send tokens
const result = await client.sendTokens(
  senderAddress,
  recipientAddress,
  [{ denom: "uatom", amount: "1000000" }],
  "auto",
);
```

## Next Steps

- **[Ethereum Integration](./ethereum-integration)** - Add Ethereum support
- **[React Integration](./react-integration)** - React patterns
- **[RainbowKit Integration](./rainbow-kit-integration)** - RainbowKit
  integration
- **[Error Handling](./error-handling)** - Error handling
