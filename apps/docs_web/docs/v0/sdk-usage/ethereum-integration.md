---
title: Ethereum Integration
sidebar_position: 4
---

# Ethereum Integration

Complete guide for integrating Oko with Ethereum and EVM-compatible
chains.

<!-- prettier-ignore -->
:::tip Get started faster
Prefer a ready-to-run example? Try the **[EVM (Next.js) starter template](https://github.com/chainapsis/oko/tree/main/examples/evm-nextjs)**.
:::

## Installation

```bash
npm install @oko-wallet/oko-sdk-eth
```

## Basic Setup

```typescript
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import { createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";

// Initialize eth wallet
const initRes = OkoEthWallet.init({
  api_key: "your-api-key",
  theme: "dark",
});

if (!initRes.success) {
  throw new Error(`Eth wallet initialization failed: ${initRes.err}`);
}

const ethWallet = initRes.data;
const provider = await ethWallet.getEthereumProvider();
```

## On-chain Signing

### Send Transaction

```typescript
import { parseEther } from "viem";

const recipientAddress = "0x...";

const [account] = await provider.request({ method: "eth_accounts" });
const hash = await provider.request({
  method: "eth_sendTransaction",
  params: [
    {
      from: account,
      to: recipientAddress,
      value: parseEther("0.1"),
      gas: BigInt(21000),
    },
  ],
});
```

## Off-chain Signing

### Personal Message

```typescript
import { toHex } from "viem";

const message = toHex("Welcome to Oko! 🚀");

const [account] = await provider.request({ method: "eth_accounts" });
const signature = await provider.request({
  method: "personal_sign",
  params: [message, account],
});
```

### EIP-712 Typed Data

```typescript
const typedData = {
  domain: {
    name: "Example DApp",
    version: "1",
    chainId: 1,
    verifyingContract: "0x742d35Cc6634C0532925a3b8D8967d01B41cdB88",
  },
  types: {
    Person: [
      { name: "name", type: "string" },
      { name: "wallet", type: "address" },
    ],
  },
  primaryType: "Person",
  message: {
    name: "Alice",
    wallet: "0x742d35Cc6634C0532925a3b8D8967d01B41cdB88",
  },
} as const;

const signature = await provider.request({
  method: "eth_signTypedData_v4",
  params: ["0x742d35Cc6634C0532925a3b8D8967d01B41cdB88", typedData],
});
```

## Multi-Chain Support

```typescript
// Add chain
await provider.request({
  method: "wallet_addEthereumChain",
  params: [
    {
      chainId: "1",
      chainName: "Ethereum Mainnet",
      rpcUrls: ["https://rpc.ankr.com/eth"],
      nativeCurrency: {
        name: "Ethereum",
        symbol: "ETH",
        decimals: 18,
      },
    },
  ],
});

// Switch chains
await provider.request({
  method: "wallet_switchEthereumChain",
  params: [{ chainId: toHex(1) }],
});
```

## Viem Integration

```typescript
import { createPublicClient, createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: custom(provider),
});

const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(provider),
});
```

### Contract Interactions

```typescript
// Deploy contract
const deployHash = await walletClient.deployContract({
  account: userAddress,
  abi: contractABI,
  bytecode: contractBytecode,
});

// Call contract function
const callHash = await walletClient.sendTransaction({
  account: userAddress,
  to: contractAddress,
  data: encodeFunctionData({
    abi: ERC20ContractABI,
    functionName: "transfer",
    args: [toAddress, amount],
  }),
});
```

## Ethers Integration

### V5

```typescript
const provider = await ethWallet.getEthereumProvider();
const ethersProvider = new ethers.providers.Web3Provider(provider);
```

### V6

```typescript
const provider = await ethWallet.getEthereumProvider();
const ethersProvider = new ethers.BrowserProvider(provider);
const signer = await ethersProvider.getSigner();
```

## Next Steps

- **[Cosmos Integration](./cosmos-integration)** - Add Cosmos support
- **[React Integration](./react-integration)** - React patterns
- **[RainbowKit Integration](./rainbow-kit-integration)** - RainbowKit
  integration
- **[Error Handling](./error-handling)** - Error handling
