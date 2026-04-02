---
title: Quick Start
sidebar_position: 2
---

# Quick Start

Unify your wallet experience across Ethereum, Cosmos, and SVM with Oko.

## Requirements

- **Node.js 22+** and **npm/yarn**
- A modern web framework (React, Vue, etc.)
- **React Native** (optional): React Native 0.70+, Expo SDK 51+ (optional)

## NPM Installation

Choose the packages you need for your target ecosystems:

```bash
# For Cosmos ecosystem
npm install @oko-wallet/oko-sdk-cosmos

# For Ethereum/EVM chains
npm install @oko-wallet/oko-sdk-eth

# For Solana/SVM chains
npm install @oko-wallet/oko-sdk-svm

# Core SDK (if building custom integration)
npm install @oko-wallet/oko-sdk-core

# For React Native
npm install @oko-wallet/oko-sdk-core-react-native
```


## Cosmos Integration

Works seamlessly with CosmJS and other Cosmos libraries:

```typescript
import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";

// Initialize Cosmos wallet
const initRes = OkoCosmosWallet.init(config);

if (!initRes.success) {
  throw new Error(`Cosmos wallet initialization failed: ${initRes.err}`);
}

const cosmosWallet = initRes.data;

// Get user accounts
const accounts = await cosmosWallet.getAccounts();

// Sign transactions with Oko
const result = await cosmosWallet.signDirect(
  "cosmoshub-4",
  accounts[0].address,
  transactionDoc,
);
```

## Ethereum Integration

Drop-in replacement for `window.ethereum` - your existing dApp code stays the
same:

```typescript
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import { createWalletClient, custom, parseEther } from "viem";
import { mainnet } from "viem/chains";

// Initialize Oko (replaces window.ethereum)
const initRes = OkoEthWallet.init(config);
if (!initRes.success) {
  throw new Error(`Eth wallet initialization failed: ${initRes.err}`);
}

const ethWallet = initRes.data;
const provider = await ethWallet.getEthereumProvider();
const [account] = await provider.request({ method: "eth_requestAccounts" });
if (!account) {
  throw new Error("User must sign in before sending a transaction");
}

// Use with your existing Web3 library like Viem
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: custom(provider),
});

// Sign transactions normally - users get the same experience
const hash = await walletClient.sendTransaction({
  to: "0x...",
  value: parseEther("0.1"),
});
```

## SVM Integration

Native support for SVM-compatible chains (Solana, etc.) using `@solana/web3.js`:

```typescript
import { OkoSvmWallet } from "@oko-wallet/oko-sdk-svm";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

// Initialize SVM wallet
const initRes = OkoSvmWallet.init({
  ...config,
  chain_id: "solana:mainnet",
});

if (!initRes.success) {
  throw new Error(`SVM wallet initialization failed: ${initRes.err}`);
}

const svmWallet = initRes.data;

// Connect and get public key
await svmWallet.connect();
const publicKey = svmWallet.publicKey!;

// Send a transaction
const connection = new Connection("https://api.mainnet-beta.solana.com");
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: new PublicKey("destination-address"),
    lamports: 1_000_000,
  }),
);

const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
transaction.feePayer = publicKey;

const signature = await svmWallet.sendTransaction(transaction, connection);
```

## Multi-Chain Support

**The power of Oko:** Use familiar APIs for Ethereum, Cosmos, and SVM chains,
while giving users **one account** that works across **all ecosystems**. Same
login, consistent experience.

```typescript
import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import { OkoSvmWallet } from "@oko-wallet/oko-sdk-svm";

// Support Ethereum, Cosmos, and SVM in one integration
const cosmosInitRes = OkoCosmosWallet.init(config);
const ethInitRes = OkoEthWallet.init(config);
const svmInitRes = OkoSvmWallet.init({ ...config, chain_id: "solana:mainnet" });

if (!cosmosInitRes.success) {
  throw new Error(`Cosmos wallet initialization failed: ${cosmosInitRes.err}`);
}

if (!ethInitRes.success) {
  throw new Error(`Eth wallet initialization failed: ${ethInitRes.err}`);
}

if (!svmInitRes.success) {
  throw new Error(`SVM wallet initialization failed: ${svmInitRes.err}`);
}

const cosmosWallet = cosmosInitRes.data;
const ethWallet = ethInitRes.data;
const svmWallet = svmInitRes.data;

// Users can interact with all three ecosystems seamlessly
// Same account, same user experience!
```

## React Native

Integrate Oko into React Native apps using the dedicated mobile SDK:

```typescript
import { Button } from "react-native";
import {
  OkoWalletProvider,
  useOkoWallet,
} from "@oko-wallet/oko-sdk-core-react-native";

// Wrap your app root
function App() {
  return (
    <OkoWalletProvider apiKey="your-api-key">
      <SignIn />
    </OkoWalletProvider>
  );
}

// Sign in from any component
function SignIn() {
  const wallet = useOkoWallet();

  const handleSignIn = async () => {
    await wallet.signIn("google");
    const info = await wallet.getWalletInfo();
    console.log("Signed in:", info?.email);
  };

  return <Button title="Sign In" onPress={handleSignIn} />;
}
```

For the complete setup guide, see
**[React Native Integration](../sdk-usage/mobile/react-native-integration)**.

## Authentication Flow

Understanding how Oko works will help you integrate it effectively:

**User Experience:**

1. User clicks "Connect Wallet" in your dApp
2. User signs in with a supported method — Google, email, GitHub, X, Discord, or Telegram (handled automatically by the SDK)
3. Cryptographic key shares are generated using threshold signatures
4. User can now sign transactions - no browser extensions needed!

## Next Steps

**🚀 Ready to integrate?**

- **[Complete SDK Examples](../sdk-usage/sdk-overview.md)** - Detailed Ethereum,
  Cosmos, and SVM code samples with multi-chain setups
- **[Architecture Overview](../architecture)** - Understand how threshold
  signatures work
- **[API Reference](../api-reference/api-overview.md)** - Complete method
  documentation

**🎯 Want to understand the technology?**

- **[Threshold ECDSA Explained](../concepts/threshold-ecdsa.md)** - Learn about
  the cryptography behind Oko (EVM/Cosmos)
- **[Threshold EdDSA Explained](../concepts/threshold-eddsa.md)** - Learn about
  the cryptography behind Oko (SVM)
