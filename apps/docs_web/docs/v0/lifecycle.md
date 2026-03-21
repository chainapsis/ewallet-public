---
title: User Journey & Lifecycle
sidebar_position: 7
---

# What does using Oko look like?

## Complete User Journey

This guide walks through the entire lifecycle of using Oko - from
account creation to transaction completion. Each step shows the actual API calls
and user experience, helping you understand what users see and feel when using
your dApp with Oko.

## Phase 1: User Onboarding

### Step 1: User Authentication

When a user first interacts with your dApp:

```typescript
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import { createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";

// User clicks "Connect Wallet" in your dApp
const initRes = OkoEthWallet.init({
  api_key: "your-api-key",
  theme: "dark",
});

if (!initRes.success) {
  throw new Error(`Eth wallet initialization failed: ${initRes.err}`);
}

const ethWallet = initRes.data;
const provider = await ethWallet.getEthereumProvider();

// This triggers Google OAuth authentication
// User sees: "Sign in with Google" popup
// User completes Google OAuth flow
// Returns: JWT token for subsequent API calls
```

**API Call Behind the Scenes:**

```
POST /tss/v1/user/signin
Headers: Authorization: Bearer <Google ID Token>
Response: {
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": {
      "email": "user@example.com",
      "wallet_id": "...",
      "public_key": "..."
    }
  }
}
```

### Step 2: Key Generation (First Time Only)

For new users, distributed key shares are created:

```typescript
// Automatic key generation for new users
// This happens transparently when wallet is first initialized
```

**API Calls Behind the Scenes:**

```
1. POST /tss/v1/keygen
   - Creates distributed key shares
   - No single party knows the complete private key
   - Stores encrypted shares in key share nodes

2. Database Updates:
   - oko_wallets table: new entry with public key
   - wallet_ks_nodes table: key share node assignments
   - oko_users table: user account information
```

**User Experience:**

- User sees: "Setting up your wallet..." loading indicator with progress bar
- Duration: ~10-15 seconds for key generation
- User receives: Wallet address (e.g.,
  `0x742d35Cc6634C0532925a3b8D8967d01B41cdB88`)
- Success message: "Wallet ready! You can now send and receive transactions."

## Phase 2: Wallet Usage

### Step 3: Account Access

Getting user's wallet information:

```typescript
// Get user's accounts
const accounts = await provider.request({
  method: "eth_accounts",
});
// Returns: ['0x742d35Cc6634C0532925a3b8D8967d01B41cdB88']

// Get balance
const balance = await provider.request({
  method: "eth_getBalance",
  params: [accounts[0], "latest"],
});
```

### Step 4: Transaction Preparation

Before signing, prepare the transaction:

```typescript
// Using Viem for type-safe transaction building
import { parseEther } from "viem";

const recipientAddress = "0x...";

// Prepare transaction
const transaction = {
  to: recipientAddress,
  value: parseEther("0.1"), // 0.1 ETH
  gas: "0x5208", // 21000
  gasPrice: "0x4A817C800", // 20 gwei
};

// Estimate gas (optional but recommended)
const gasEstimate = await provider.request({
  method: "eth_estimateGas",
  params: [transaction],
});
```

## Phase 3: Transaction Signing

### Step 5: Signature Request

When user initiates a transaction:

```typescript
// User clicks "Send Transaction" in your dApp
const txHash = await provider.request({
  method: "eth_sendTransaction",
  params: [transaction],
});

console.log("Transaction hash:", txHash);
// Output: 0xa1b2c3d4e5f6...
```

**What Happens Behind the Scenes:**

1. **Triple Generation (Preprocessing)**

```
POST /tss/v1/triples
- Generates Beaver triples for efficient signing
- This can happen in background before user action
- Improves signing speed when needed
```

2. **Presignature Creation**

```
POST /tss/v1/presign
- Creates presignature components
- Uses preprocessed triples + key shares
- Prepares for final signature step
```

3. **Final Signature**

```
POST /tss/v1/sign/step1, /tss/v1/sign/step2
Headers: Authorization: Bearer <JWT Token>
Body: {
  "session_id": "...",
  "msg": [...],
  "msgs_1": {...}
}
Response: {
  "success": true,
  "data": {
    "sign_output": { "r": [...], "s": [...] }
  }
}
Note: Sign endpoint uses a two-step protocol (step1 and step2)
```

**User Experience Timeline:**

1. **Transaction Request**: User clicks "Send Transaction" in your dApp
2. **Details Review**: User sees transaction details in a modal:
   - Recipient address
   - Amount to send
   - Gas fee estimate
   - Network information
3. **Confirmation**: User clicks "Approve" to proceed
4. **Signing Process**: User sees "Signing..." with progress indicator (2-3
   seconds)
5. **Submission**: Transaction is signed and submitted to blockchain
6. **Success**: User sees "Transaction submitted!" with transaction hash

## Phase 4: Transaction Completion

### Step 6: Blockchain Submission

The signed transaction is submitted to the network:

```typescript
// Transaction is automatically submitted after signing
console.log("Transaction hash:", txHash);
// Output: 0xa1b2c3d4...

// Monitor transaction status
const receipt = await provider.request({
  method: "eth_getTransactionReceipt",
  params: [txHash],
});

if (receipt.status === "0x1") {
  console.log("Transaction successful!");
} else {
  console.log("Transaction failed");
}
```

### Step 7: Confirmation & Receipt

```typescript
// Wait for confirmations
const waitForConfirmation = async (hash, confirmations = 1) => {
  let receipt = null;
  while (!receipt) {
    receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const currentBlock = await provider.request({
    method: "eth_blockNumber",
  });

  const confirmationCount =
    parseInt(currentBlock, 16) - parseInt(receipt.blockNumber, 16);

  if (confirmationCount >= confirmations) {
    return receipt;
  }

  // Wait for more confirmations
  return waitForConfirmation(hash, confirmations);
};

const finalReceipt = await waitForConfirmation(txHash, 3);
console.log("Transaction confirmed with 3 blocks");
```

## Complete Code Example

Here's a full implementation showing the entire lifecycle:

```typescript
import { OkoEthWallet } from "@oko-wallet/oko-sdk-eth";
import {
  createWalletClient,
  createPublicClient,
  custom,
  parseEther,
} from "viem";
import { mainnet } from "viem/chains";

class OkoWallet {
  private ethWallet: any;
  private provider: any;
  private walletClient: any;
  private publicClient: any;

  async initialize(apiKey: string) {
    // Step 1: Initialize OkoEthWallet
    const initRes = OkoEthWallet.init({
      api_key: apiKey,
      theme: "dark",
    });

    if (!initRes.success) {
      throw new Error(`Eth wallet initialization failed: ${initRes.err}`);
    }

    this.ethWallet = initRes.data;
    this.provider = await this.ethWallet.getEthereumProvider();

    // Step 2: Create clients
    this.walletClient = createWalletClient({
      chain: mainnet,
      transport: custom(this.provider),
    });

    this.publicClient = createPublicClient({
      chain: mainnet,
      transport: custom(this.provider),
    });

    console.log("Oko initialized");
  }

  async getAccount() {
    // Step 3: Get user account
    const accounts = await this.provider.request({
      method: "eth_accounts",
    });
    return accounts[0];
  }

  async getBalance(address: string) {
    const balance = await this.publicClient.getBalance({ address });
    return balance;
  }

  async sendTransaction(to: string, amount: string) {
    const account = await this.getAccount();

    // Step 4: Prepare transaction
    const transaction = {
      account,
      to,
      value: parseEther(amount),
    };

    // Step 5: Sign and send
    const hash = await this.walletClient.sendTransaction(transaction);

    // Step 6: Wait for confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    return {
      hash,
      receipt,
      success: receipt.status === "success",
    };
  }
}

// Usage
const wallet = new OkoWallet();
await wallet.initialize("your-api-key");

const account = await wallet.getAccount();
console.log("User account:", account);

const balance = await wallet.getBalance(account);
console.log("Balance:", balance);

const result = await wallet.sendTransaction(
  "0x742d35Cc6634C0532925a3b8D8967d01B41cdB88",
  "0.1",
);
console.log("Transaction result:", result);
```

## Cosmos Transaction Lifecycle

The process is similar for Cosmos transactions:

```typescript
import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";

// Step 1: Initialize Cosmos wallet
const initRes = OkoCosmosWallet.init({
  api_key: "your-api-key",
  theme: "dark",
});

if (!initRes.success) {
  throw new Error(`Cosmos wallet initialization failed: ${initRes.err}`);
}

const cosmosWallet = initRes.data;

// Step 2: Get accounts
const accounts = await cosmosWallet.getAccounts();
const account = accounts[0];

// Step 3: Prepare transaction
const signDoc = {
  chainId: "cosmoshub-4",
  accountNumber: "1234",
  sequence: "0",
  fee: {
    amount: [{ denom: "uatom", amount: "1000" }],
    gas: "200000",
  },
  msgs: [
    {
      type: "cosmos-sdk/MsgSend",
      value: {
        from_address: account.address,
        to_address: "cosmos1...",
        amount: [{ denom: "uatom", amount: "1000000" }],
      },
    },
  ],
  memo: "",
};

// Step 4: Sign transaction
const signResult = await cosmosWallet.signAmino({
  signerAddress: account.address,
  signDoc,
});

// Step 5: Broadcast transaction
// (Usually done with a client like @cosmjs/stargate)
```

## SVM Transaction Lifecycle

The process for SVM-compatible chains (Solana, etc.):

```typescript
import { OkoSvmWallet } from "@oko-wallet/oko-sdk-svm";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

// Step 1: Initialize SVM wallet
const initRes = OkoSvmWallet.init({
  api_key: "your-api-key",
  chain_id: "solana:mainnet",
  theme: "dark",
});

if (!initRes.success) {
  throw new Error(`SVM wallet initialization failed: ${initRes.err}`);
}

const svmWallet = initRes.data;

// Step 2: Connect and get public key
await svmWallet.connect();
const publicKey = svmWallet.publicKey!;

// Step 3: Prepare transaction
const connection = new Connection("https://api.mainnet.solana.com");
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: new PublicKey("destination-address"),
    lamports: 1_000_000,
  }),
);

// Step 4: Sign and send transaction
const signature = await svmWallet.sendTransaction(transaction, connection);

// Step 5: Confirm transaction
const confirmation = await connection.confirmTransaction(signature);
console.log("Transaction confirmed:", confirmation);
```

## Error Handling & Recovery

### Common Error Scenarios

```typescript
try {
  const result = await wallet.sendTransaction(to, amount);
  console.log("Transaction successful:", result.hash);
} catch (error: any) {
  switch (error.code) {
    case 4001:
      console.log("User rejected transaction");
      break;
    case -32603:
      console.log("Internal error during signing");
      break;
    case -32000:
      console.log("Insufficient funds");
      break;
    default:
      console.log("Unknown error:", error.message);
  }
}
```

### Session Management

```typescript
// Check if user is authenticated
const accounts = await provider.request({ method: "eth_accounts" });
const isAuthenticated = accounts.length > 0;

if (isAuthenticated) {
  console.log("User is connected:", accounts[0]);
} else {
  console.log("User needs to connect");
}

// Sign out (if needed)
if (ethWallet && ethWallet.okoWallet) {
  await ethWallet.okoWallet.signOut();
}
```

### User State Persistence

```typescript
// Oko automatically handles session persistence
// Users stay logged in across browser sessions
// No need to manually manage authentication state

// Check connection status
const accounts = await provider.request({ method: "eth_accounts" });
if (accounts.length > 0) {
  console.log("User is connected:", accounts[0]);
} else {
  console.log("User needs to connect");
}

// Get user info from OkoEthWallet
if (ethWallet && ethWallet.okoWallet) {
  const userInfo = await ethWallet.okoWallet.getUserInfo();
  console.log("User info:", userInfo);
}
```

## Summary

**Key Points:**

1. **One-time setup**: Key generation happens only on first use
2. **Transparent signing**: Complex threshold signature process is hidden from
   users
3. **Standard interface**: Uses familiar Web3 methods (`eth_sendTransaction`,
   etc.)
4. **No private keys**: Users never see or manage cryptographic material
5. **Google OAuth**: Familiar authentication flow
6. **Cross-application**: Same wallet works across different dApps

**Performance Characteristics:**

- **First-time setup**: 10-15 seconds (key generation)
- **Subsequent logins**: 2-3 seconds (OAuth + session restore)
- **Transaction signing**: 2-3 seconds (threshold signature)
- **Standard compatibility**: Works with all existing Web3 tools

This lifecycle provides the security benefits of distributed key management
while maintaining the familiar user experience of traditional wallets.
