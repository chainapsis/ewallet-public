---
title: Supported Chains
sidebar_position: 3
---

# Supported Chains

Oko supports Cosmos-SDK-based chains, EVM-based chains, and SVM-compatible chains (Solana, etc.).
Chain metadata (IDs, names, currencies, RPCs, images, etc.) is sourced from the
open-source Keplr Chain Registry. Contributions are
welcome — you can add or update chains via pull requests.

- Registry: https://github.com/chainapsis/keplr-chain-registry

## Ecosystems

- **Cosmos**: Chains identified like `cosmoshub-4`, `osmosis-1`, etc.
- **EVM**: Chains identified via CAIP-2 like `eip155:1` (Ethereum), `eip155:10`
  (Optimism), `eip155:8453` (Base), etc.
- **SVM**: SVM-compatible chains identified like `solana:mainnet`, `solana:devnet`, etc.

> Note: If a chain exists in the registry, Oko can discover and use
> it automatically. If your chain isn’t there yet, add it via PR (see below).

## Add or Update a Chain

1. Check the registry for your chain
   - Cosmos directory: `cosmos/`
   - EVM directory: `evm/`
   - SVM directory: `svm/`

2. Prepare the chain JSON and assets per the registry’s requirements
   - Provide chain ID, RPC/REST endpoints, currencies, images, etc.

3. Open a PR to `keplr-chain-registry`
   - The Keplr team will review and merge.

Once merged, Oko SDK will pick it up automatically in the next fetch
cycle (no app update needed).

## SVM

SVM-compatible chains are identified using `<chain>:<network>` format:

| Network | Chain ID | Description |
|---------|----------|-------------|
| Mainnet | `solana:mainnet` | Solana mainnet|
| Devnet | `solana:devnet` | Solana devnet |

Pass the `chain_id` when initializing the SVM wallet:

```typescript
import { OkoSvmWallet } from "@oko-wallet/oko-sdk-svm";

const initRes = OkoSvmWallet.init({
  api_key: "your-api-key",
  chain_id: "solana:mainnet",
});
```

Oko uses threshold EdDSA (FROST) for SVM chain signing, providing the same MPC
security model as the Cosmos and EVM integrations.

<!-- prettier-ignore -->
:::info Registry details
For full schema details, examples, and submission requirements, see the registry [README](https://github.com/chainapsis/keplr-chain-registry?tab=readme-ov-file#guidelines-for-community-driven-non-native-chain-integration).
:::

<!-- prettier-ignore -->
:::tip React Native
The React Native SDK (`@oko-wallet/oko-sdk-core-react-native`) supports all the
same chains listed above. The underlying chain support is identical to the web
SDKs. See **[React Native Integration](../sdk-usage/mobile/react-native-integration)**
for mobile setup.
:::

<!-- prettier-ignore -->
:::warning Custom chains
Adding chains dynamically via SDK methods such as `wallet_switchEthereumChain` or Keplr’s
[`experimentalSuggestChain`](https://docs.keplr.app/api/guide/suggest-chain) is
not supported yet in Oko. This capability is planned for a future
update.
:::
