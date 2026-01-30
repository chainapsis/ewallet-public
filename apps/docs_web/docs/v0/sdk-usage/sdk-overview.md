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

const initRes = OkoSvmWallet.init(config);
if (!initRes.success) {
  throw new Error(`Solana wallet initialization failed: ${initRes.err}`);
}

const svmWallet = initRes.data;
await svmWallet.connect();
```

## Next Steps

- **[Cosmos Integration](./cosmos-integration)** - Complete Cosmos setup
- **[Ethereum Integration](./ethereum-integration)** - Complete Ethereum setup
- **[Solana Integration](./solana-integration)** - Complete Solana setup
- **[React Integration](./react-integration)** - React patterns
- **[RainbowKit Integration](./rainbow-kit-integration)** - RainbowKit
  integration
- **[Error Handling](./error-handling)** - Best practices
