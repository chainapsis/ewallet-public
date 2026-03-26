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

| Property | Type | Description |
|----------|------|-------------|
| `wallet` | `OkoWalletInterface \| null` | Raw SDK instance for advanced usage |
| `isReady` | `boolean` | SDK fully initialized and usable |
| `isSignedIn` | `boolean` | User is authenticated |
| `authType` | `AuthType \| null` | Auth provider (`"google"`, `"x"`, `"discord"`, etc.) |
| `email` | `string \| null` | User email |
| `name` | `string \| null` | User display name |
| `publicKey` | `string \| null` | secp256k1 public key |
| `signIn` | `(type: SignInType) => Promise<void>` | Start sign-in flow |
| `signOut` | `() => Promise<void>` | Sign out current user |
| `openSignInModal` | `() => Promise<void>` | Open built-in provider picker UI |

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

| Property | Type | Description |
|----------|------|-------------|
| `ethWallet` | `OkoEthWalletInterface \| null` | ETH SDK instance |
| `isInitialized` | `boolean` | `init()` succeeded |
| `isReady` | `boolean` | Fully initialized and usable |
| `address` | `string \| null` | EVM address (`0x...`), same across all EVM chains |

### `useOkoCosmos`

```tsx
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";

function CosmosPanel() {
  const { cosmosWallet, isReady } = useOkoCosmos();

  if (!isReady || !cosmosWallet) return null;

  const signer = cosmosWallet.getOfflineSigner("cosmoshub-4");
}
```

| Property | Type | Description |
|----------|------|-------------|
| `cosmosWallet` | `OkoCosmosWalletInterface \| null` | Cosmos SDK instance |
| `isInitialized` | `boolean` | `init()` succeeded |
| `isReady` | `boolean` | Fully initialized and usable |

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

| Property | Type | Description |
|----------|------|-------------|
| `address` | `string \| null` | Bech32 address for the given chain (e.g. `cosmos1...`, `osmo1...`) |
| `isLoading` | `boolean` | Address is being resolved |

### `useOkoSvm`

```tsx
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";

function SolanaPanel() {
  const { svmWallet, isReady, address } = useOkoSvm();

  if (!isReady || !svmWallet) return null;

  return <p>Solana Address: {address}</p>;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `svmWallet` | `OkoSvmWalletInterface \| null` | SVM SDK instance |
| `isInitialized` | `boolean` | `init()` succeeded |
| `isReady` | `boolean` | Fully initialized and usable |
| `address` | `string \| null` | Solana base58 address, same across all Solana clusters |

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

## Next Steps

- **[Ethereum Integration](./ethereum-integration)** — EVM signing and
  transactions
- **[Cosmos Integration](./cosmos-integration)** — Cosmos signing and key
  management
- **[Solana Integration](./solana-integration)** — Solana Wallet Standard
- **[Error Handling](./error-handling)** — Error handling patterns
