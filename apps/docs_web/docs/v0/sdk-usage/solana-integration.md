---
title: Solana Integration
sidebar_position: 4
---

# Solana Integration

Complete guide for integrating Oko with Solana.

<!-- prettier-ignore -->
:::tip Wallet Standard Support
Oko Solana SDK fully supports the [Wallet Standard](https://github.com/anza-xyz/wallet-standard), making it compatible with most Solana dApps automatically.
:::

## Installation

```bash
npm install @oko-wallet/oko-sdk-svm @solana/web3.js
```

## Basic Setup

```typescript
import { OkoSvmWallet } from "@oko-wallet/oko-sdk-svm";
import { SOLANA_MAINNET_CHAIN } from "@solana/wallet-standard-chains";

// Initialize Solana wallet
const initRes = OkoSvmWallet.init({
  api_key: "your-api-key",
  chain_id: SOLANA_MAINNET_CHAIN,
});

if (!initRes.success) {
  throw new Error(`Solana wallet initialization failed: ${initRes.err}`);
}

const wallet = initRes.data;

// Connect to get public key
await wallet.connect();
console.log("Connected:", wallet.publicKey?.toBase58());
```

## On-chain Signing

### Send Transaction

```typescript
import {
  Connection,
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const recipientAddress = new PublicKey("...");

// Create transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: wallet.publicKey!,
    toPubkey: recipientAddress,
    lamports: 0.1 * LAMPORTS_PER_SOL,
  }),
);

// Get recent blockhash
const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
transaction.feePayer = wallet.publicKey!;

// Sign and send
const signature = await wallet.sendTransaction(transaction, connection);
console.log("Transaction sent:", signature);
```

### Sign and Send Transaction (Phantom-compatible)

```typescript
// Alternative method that returns { signature }
const { signature } = await wallet.signAndSendTransaction(
  transaction,
  connection,
);
```

### Sign Multiple Transactions

```typescript
const transactions = [transaction1, transaction2, transaction3];
const signedTransactions = await wallet.signAllTransactions(transactions);

// Send each signed transaction
for (const signed of signedTransactions) {
  const sig = await connection.sendRawTransaction(signed.serialize());
  console.log("Sent:", sig);
}
```

## Off-chain Signing

### Sign Message

```typescript
const message = new TextEncoder().encode("Welcome to Oko!");
const signature = await wallet.signMessage(message);

console.log("Signature:", Buffer.from(signature).toString("base64"));
```

## Event Handling

```typescript
// Listen for connection events
wallet.on("connect", (publicKey) => {
  console.log("Connected:", publicKey.toBase58());
});

wallet.on("disconnect", () => {
  console.log("Disconnected");
});

// Listen for account changes
wallet.on("accountChanged", (publicKey) => {
  if (publicKey) {
    console.log("Account changed:", publicKey.toBase58());
  } else {
    console.log("Account disconnected");
  }
});

// Remove listener
const unsubscribe = wallet.on("connect", handler);
unsubscribe(); // or wallet.off("connect", handler);
```

## Wallet Standard Integration

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
  },
};

const initRes = OkoSvmWallet.init({
  api_key: "your-api-key",
  chain_id: SOLANA_MAINNET_CHAIN,
});

if (initRes.success) {
  // Register wallet-standard separately (call once globally)
  registerWalletStandard(initRes.data, [SOLANA_CONFIG]);
}
```

### Supported Features

| Feature                         | Description                     |
| ------------------------------- | ------------------------------- |
| `standard:connect`              | Connect to wallet               |
| `standard:disconnect`           | Disconnect from wallet          |
| `standard:events`               | Subscribe to wallet events      |
| `solana:signMessage`            | Sign arbitrary messages         |
| `solana:signTransaction`        | Sign transactions               |
| `solana:signAndSendTransaction` | Sign and broadcast transactions |

## Versioned Transactions

Oko supports both legacy and versioned transactions:

```typescript
import { VersionedTransaction, TransactionMessage } from "@solana/web3.js";

// Create versioned transaction
const messageV0 = new TransactionMessage({
  payerKey: wallet.publicKey!,
  recentBlockhash: blockhash,
  instructions: [transferInstruction],
}).compileToV0Message();

const versionedTx = new VersionedTransaction(messageV0);

// Sign versioned transaction
const signedTx = await wallet.signTransaction(versionedTx);
```

## Disconnect

```typescript
await wallet.disconnect();
console.log("Wallet disconnected");
```

## Next Steps

- **[Ethereum Integration](./ethereum-integration)** - Add Ethereum support
- **[Cosmos Integration](./cosmos-integration)** - Add Cosmos support
- **[React Integration](./react-integration)** - React patterns
- **[Error Handling](./error-handling)** - Error handling
