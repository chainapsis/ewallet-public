---
title: React Integration
sidebar_position: 5
---

# React Integration

Complete guide for integrating Oko into React applications.

<!-- prettier-ignore -->
:::tip Get started faster
Prefer a ready-to-run example? Try the **[Cosmos + EVM + SVM (React) starter template](https://github.com/chainapsis/oko/tree/main/examples/multi_ecosystem_react)**.
:::

## Context Provider

```typescript
// contexts/OkoProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { OkoCosmosWallet } from '@oko-wallet/oko-sdk-cosmos';
import { OkoEthWallet } from '@oko-wallet/oko-sdk-eth';
import { OkoSvmWallet } from '@oko-wallet/oko-sdk-svm';

const OkoContext = createContext(null);

export const OkoProvider = ({ children }) => {
  const [cosmosWallet, setCosmosWallet] = useState(null);
  const [ethWallet, setEthWallet] = useState(null);
  const [svmWallet, setSvmWallet] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  function signIn() {
    const okoWallet = cosmosWallet.okoWallet || ethWallet.okoWallet;
    if (!okoWallet) {
      throw new Error('Core is not initialized');
    }

    await okoWallet.signIn('google');
  }

  function signOut() {
    const okoWallet = cosmosWallet.okoWallet || ethWallet.okoWallet;
    if (!okoWallet) {
      throw new Error('Core is not initialized');
    }

    await okoWallet.signOut();
  }

  useEffect(() => {
    const initWallet = () => {
      try {
        const cosmosInitRes = OkoCosmosWallet.init({
          api_key: process.env.REACT_APP_OKO_API_KEY,
          theme: "dark",
        });
        if (!cosmosInitRes.success) {
          return;
        }

        const ethInitRes = OkoEthWallet.init({
          api_key: process.env.REACT_APP_OKO_API_KEY,
        });
        if (!ethInitRes.success) {
          return;
        }

        const svmInitRes = OkoSvmWallet.init({
          api_key: process.env.REACT_APP_OKO_API_KEY,
          chain_id: 'solana:mainnet',
        });
        if (!svmInitRes.success) {
          return;
        }

        setCosmosWallet(cosmosInitRes.data);
        setEthWallet(ethInitRes.data);
        setSvmWallet(svmInitRes.data);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
      }
    };

    initWallet();
  }, []);

  return (
    <OkoContext.Provider
      value={{ cosmosWallet, ethWallet, svmWallet, isInitialized, signIn, signOut }}
    >
      {children}
    </OkoContext.Provider>
  );
};

export const useOko = () => {
  const context = useContext(OkoContext);
  if (!context) {
    throw new Error('useOko must be used within a OkoProvider');
  }
  return context;
};
```

## Components

### Connect Button

```typescript
// components/ConnectWalletButton.tsx
import React from 'react';

import { useOko } from '../contexts/OkoProvider';

export const ConnectWalletButton = () => {
  const { isInitialized, signIn } = useOko();

  if (isInitialized) {
    return (
      <button onClick={signIn} className="px-4 py-2 bg-red-500 text-white rounded">
        Connect
      </button>
    );
  }

  return null;
};
```

### Transaction Widget

```typescript
// components/TransactionWidget.tsx
import React, { useState } from 'react';
import { parseEther } from 'viem';

import { useOko } from '../contexts/OkoProvider';

export const TransactionWidget = () => {
  const { ethWallet } = useOko();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!ethWallet) {
      return;
    }

    try {
      const provider = await ethWallet.getEthereumProvider();

      await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          to: recipient,
          value: `0x${parseInt(amount).toString(16)}`,
          gas: '0x5208',
        }],
      });
      setRecipient('');
      setAmount('');
    } catch (err) {
      console.error('Transaction failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient address"
        className="w-full border rounded px-3 py-2"
        required
      />
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (ETH)"
        step="0.001"
        className="w-full border rounded px-3 py-2"
        required
      />
      <button
        type="submit"
        className="w-full px-4 py-2 bg-green-500 text-white rounded"
      >
        Send Transaction
      </button>
    </form>
  );
};
```

## App Setup

```typescript
// App.tsx
import React from 'react';
import { OkoProvider } from './contexts/OkoProvider';
import { ConnectWalletButton } from './components/ConnectWalletButton';
import { TransactionWidget } from './components/TransactionWidget';

function App() {
  return (
    <OkoProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-8">
            Oko Demo
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
              <ConnectWalletButton />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Send Transaction</h2>
              <TransactionWidget />
            </div>
          </div>
        </div>
      </div>
    </OkoProvider>
  );
}

export default App;
```

## Runtime Theme Switching

If your app supports dark mode, sync the theme with Oko at runtime using
`setTheme()`:

```typescript
// hooks/useThemeSync.ts
import { useEffect } from "react";
import { useOko } from "../contexts/OkoProvider";

export function useThemeSync(theme: "light" | "dark") {
  const { cosmosWallet, isInitialized } = useOko();

  useEffect(() => {
    if (!isInitialized || !cosmosWallet) return;
    cosmosWallet.okoWallet.setTheme(theme);
  }, [theme, isInitialized, cosmosWallet]);
}
```

## Next Steps

- **[Cosmos Integration](./cosmos-integration)** - Cosmos setup
- **[Ethereum Integration](./ethereum-integration)** - Ethereum setup
- **[SVM Integration](./solana-integration)** - SVM setup (Solana, etc.)
- **[RainbowKit Integration](./rainbow-kit-integration)** - RainbowKit
  integration
- **[Error Handling](./error-handling)** - Error handling patterns
- **[React Native Integration](./mobile/react-native-integration)** - Building a
  mobile app? See the React Native guide
