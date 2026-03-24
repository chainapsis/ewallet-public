---
title: Error Handling
sidebar_position: 10
---

# Error Handling & Best Practices

Essential error handling patterns and best practices for Oko SDKs.

## Common Error Types

### User Rejection

```typescript
try {
  await provider.request({
    method: "eth_sendTransaction",
    params: [transaction],
  });
} catch (error) {
  if (error.code === ProviderRpcErrorCode.UserRejectedRequest) {
    console.log("User rejected transaction");
  }
}
```

### Insufficient Funds

```typescript
try {
  await provider.request({
    method: "eth_sendTransaction",
    params: [transaction],
  });
} catch (error) {
  if (error.message.match(/insufficient|funds|balance/i)) {
    console.log("Insufficient balance");
  }
}
```

### Gas Estimation

```typescript
try {
  const gasEstimate = await provider.request({
    method: "eth_estimateGas",
    params: [transaction],
  });
  const gasEstimate = await publicClient.estimateGas(transaction);
  const gasLimit = (BigInt(gasEstimate) * BigInt(120)) / BigInt(100); // 20% margin
} catch (error) {
  // Fallback to default gas
  const gasLimit = BigInt(21000);
}
```

## Transaction Monitoring

```typescript
export async function monitorTransaction(hash, publicClient, timeout = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await provider.request({
        method: "eth_getTransactionReceipt",
        params: [hash],
      });

      if (receipt) {
        return {
          status: receipt.status === "0x1" ? "success" : "failed",
          receipt,
        };
      }
    } catch (error) {
      // Transaction not yet mined
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { status: "timeout" };
}
```

## Best Practices

### Always Handle Errors

```typescript
// Good
try {
  const result = await walletClient.sendTransaction(transaction);
  console.log("Transaction sent:", result);
} catch (error) {
  console.error("Transaction failed:", error);
  // Show user-friendly error message
}

// Bad
const result = await walletClient.sendTransaction(transaction); // Unhandled promise
```

### Provide User Feedback

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

const handleTransaction = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const result = await walletClient.sendTransaction(transaction);
    // Show success message
  } catch (err) {
    setError(err.message);
    // Show error message
  } finally {
    setIsLoading(false);
  }
};
```

### Log Errors for Debugging

```typescript
try {
  await walletClient.sendTransaction(transaction);
} catch (error) {
  console.error("Transaction failed:", {
    error: error.message,
    code: error.code,
    transaction,
    timestamp: new Date().toISOString(),
  });
  throw error;
}
```

## React Native Error Patterns

When using the React Native SDK
(`@oko-wallet/oko-sdk-core-react-native`), you may encounter these
platform-specific errors:

### User Cancelled Sign-In

The user closed the OS browser before completing the OAuth flow. The
`signIn()` call will throw an error. Handle this gracefully in your UI:

```typescript
try {
  await wallet.signIn("google");
} catch (error) {
  // User may have cancelled — show a retry option, not a crash screen
  console.warn("Sign-in cancelled or failed:", error);
}
```

### Browser Session Missing

The SDK automatically clears cached wallet info when the OS browser
session becomes invalid (e.g., `api_key_not_found`, `wallet_not_found`,
`jwt_not_found`). This triggers a `CORE__accountsChanged` event with all
fields set to `null`. Listen for this event to update your UI.

### Missing Browser Dependency

If neither `expo-web-browser` nor `react-native-inappbrowser-reborn` is
installed, the SDK throws an error when attempting any browser-based
operation (`signIn`, `openModal`, etc.). Install one of the two supported
packages.

For more RN-specific issues, see
**[React Native Integration — Troubleshooting](./mobile/react-native-integration#troubleshooting)**.

## Next Steps

- **[SDK Overview](./sdk-overview)** - Back to basics
- **[Cosmos Integration](./cosmos-integration)** - Cosmos patterns
- **[Ethereum Integration](./ethereum-integration)** - Ethereum patterns
- **[React Integration](./react-integration)** - React patterns
- **[RainbowKit Integration](./rainbow-kit-integration)** - RainbowKit
  integration
