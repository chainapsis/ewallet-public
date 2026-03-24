---
title: React Hooks
sidebar_position: 2
---

# React Hooks

`@oko-wallet/oko-sdk-react` provides ready-to-use React hooks for Oko wallet
integration. No manual context setup needed.

## Installation

```bash
npm install @oko-wallet/oko-sdk-react
```

All chain SDKs (EVM, Cosmos, Solana) are included as dependencies.

## Setup

Wrap your app with `OkoProvider`. Only configured chains are initialized.

```tsx
import { OkoProvider } from "@oko-wallet/oko-sdk-react";

export default function App({ children }) {
  return (
    <OkoProvider
      config={{
        apiKey: "your-api-key",
        sdkEndpoint: "https://sdk.oko.app",
        eth: true,
        cosmos: true,
        svm: { chainId: "solana:mainnet" },
      }}
    >
      {children}
    </OkoProvider>
  );
}
```

## `useOko`

Core hook for authentication and wallet state.

```tsx
import { useOko } from "@oko-wallet/oko-sdk-react";

function ConnectButton() {
  const { isReady, isSignedIn, signOut, openSignInModal, walletInfo } = useOko();

  if (!isReady) {
    return <p>Loading...</p>;
  }

  if (isSignedIn) {
    return (
      <div>
        <p>Signed in as {walletInfo.email}</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  return <button onClick={openSignInModal}>Sign In</button>;
}
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `wallet` | `OkoWalletInterface \| null` | Raw SDK instance for advanced usage |
| `isReady` | `boolean` | SDK fully initialized and usable |
| `isSignedIn` | `boolean` | User is authenticated |
| `signIn` | `(type: SignInType) => Promise<void>` | Start sign-in flow |
| `signOut` | `() => Promise<void>` | Sign out current user |
| `openSignInModal` | `() => Promise<void>` | Open built-in provider picker UI |
| `walletInfo` | `WalletInfo` | User profile data (see below) |

### `WalletInfo`

| Property | Type | Description |
|----------|------|-------------|
| `authType` | `AuthType \| null` | Auth provider (`"google"`, `"x"`, `"discord"`, etc.) |
| `email` | `string \| null` | User email |
| `name` | `string \| null` | User display name |
| `publicKey` | `string \| null` | secp256k1 public key |

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
  const { ethWallet, isReady } = useOkoEth();

  if (!isReady || !ethWallet) return null;

  const address = await ethWallet.getAddress();
  const provider = ethWallet.getEthereumProvider();
}
```

### `useOkoCosmos`

```tsx
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";

function CosmosPanel() {
  const { cosmosWallet, isReady } = useOkoCosmos();

  if (!isReady || !cosmosWallet) return null;

  const key = await cosmosWallet.getKey("cosmoshub-4");
  const signer = cosmosWallet.getOfflineSigner();
}
```

### `useOkoSvm`

```tsx
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";

function SolanaPanel() {
  const { svmWallet, isReady } = useOkoSvm();

  if (!isReady || !svmWallet) return null;

  await svmWallet.connect();
  const publicKey = svmWallet.publicKey;
}
```

### Chain Hook Return Values

All chain hooks return the same shape:

| Property | Type | Description |
|----------|------|-------------|
| `ethWallet` / `cosmosWallet` / `svmWallet` | `Interface \| null` | Chain SDK instance |
| `isInitialized` | `boolean` | `init()` succeeded |
| `isReady` | `boolean` | Fully initialized and usable |

## Full Example

```tsx
import { OkoProvider, useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";

function Wallet() {
  const { isReady, isSignedIn, signOut, openSignInModal, walletInfo } = useOko();
  const { ethWallet } = useOkoEth();
  const { cosmosWallet } = useOkoCosmos();
  const { svmWallet } = useOkoSvm();

  if (!isReady) return <p>Initializing...</p>;

  if (!isSignedIn) {
    return <button onClick={openSignInModal}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome, {walletInfo.name || walletInfo.email}</p>
      <p>Auth: {walletInfo.authType}</p>
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

## Next Steps

- **[Ethereum Integration](./ethereum-integration)** — EVM signing and
  transactions
- **[Cosmos Integration](./cosmos-integration)** — Cosmos signing and key
  management
- **[Solana Integration](./solana-integration)** — Solana Wallet Standard
- **[Error Handling](./error-handling)** — Error handling patterns
