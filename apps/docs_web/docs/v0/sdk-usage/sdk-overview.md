---
title: SDK Overview
sidebar_position: 1
---

# SDK Overview

Oko provides specialized SDKs for different blockchain ecosystems. Choose the
right packages for your project.

<!-- prettier-ignore -->
:::tip Get started faster
Prefer a ready-to-run example? Try the
**[Starter Templates](../getting-started/starter-templates.md)**.
:::

## Installation

```bash
# For Cosmos ecosystem
npm install @oko-wallet/oko-sdk-cosmos

# For Ethereum/EVM chains
npm install @oko-wallet/oko-sdk-eth

# For Solana/SVM chains
npm install @oko-wallet/oko-sdk-svm

# Core SDK (for custom integration)
npm install @oko-wallet/oko-sdk-core

# For React Native
npm install @oko-wallet/oko-sdk-core-react-native
```

## Quick Setup

### Cosmos

```typescript
import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";

const initRes = OkoCosmosWallet.init(config);
if (!initRes.success) {
  throw new Error(`Cosmos wallet initialization failed: ${initRes.err}`);
}

const cosmosWallet = initRes.data;
```

### Ethereum

```typescript
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";

const initRes = OkoEthWallet.init(config);
if (!initRes.success) {
  throw new Error(`Eth wallet initialization failed: ${initRes.err}`);
}

const ethWallet = initRes.data;
const provider = await ethWallet.getEthereumProvider();
```

### Solana

```typescript
import { OkoSvmWallet } from "@oko-wallet/oko-sdk-svm";

const initRes = OkoSvmWallet.init({
  ...config,
  chain_id: "solana:mainnet",
});
if (!initRes.success) {
  throw new Error(`Solana wallet initialization failed: ${initRes.err}`);
}

const svmWallet = initRes.data;
await svmWallet.connect();
```

### React Native

```typescript
import { Button } from "react-native";
import {
  OkoWalletProvider,
  useOkoWallet,
} from "@oko-wallet/oko-sdk-core-react-native";

// Wrap your app with the provider
function App() {
  return (
    <OkoWalletProvider apiKey="your-api-key">
      <WalletScreen />
    </OkoWalletProvider>
  );
}

// Use the hook in any component
function WalletScreen() {
  const wallet = useOkoWallet();

  const handleSignIn = async () => {
    await wallet.signIn("google");
  };

  return <Button title="Sign in with Google" onPress={handleSignIn} />;
}
```

## Self-Hosting Configuration

When running your own infrastructure, set `sdk_endpoint` to your self-hosted
`oko_attached` URL:

```typescript
const config = {
  api_key: "your-api-key",
  sdk_endpoint: "https://your-oko-attached.example.com",
};
```

The default endpoint (`https://attached.oko.app`) is not available for
self-hosted deployments.

## Next Steps

- **[Cosmos Integration](./cosmos-integration)** - Complete Cosmos setup
- **[Ethereum Integration](./ethereum-integration)** - Complete Ethereum setup
- **[Solana Integration](./solana-integration)** - Complete Solana setup
- **[React Integration](./react-integration)** - React patterns
- **[React Native Integration](./mobile/react-native-integration)** - React
  Native setup and usage
- **[RainbowKit Integration](./rainbow-kit-integration)** - RainbowKit
  integration
- **[Error Handling](./error-handling)** - Best practices
