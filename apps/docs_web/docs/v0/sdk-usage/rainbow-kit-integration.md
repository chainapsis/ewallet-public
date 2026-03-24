---
title: RainbowKit Integration
sidebar_position: 5
---

# RainbowKit Integration

Learn how to integrate Oko with RainbowKit for seamless Web3 wallet
connectivity.

<!-- prettier-ignore -->
:::tip Get started faster
Prefer a ready-to-run example? Try the **[EVM + wagmi (Next.js) starter template](https://github.com/chainapsis/oko/tree/main/examples/evm-wagmi-nextjs)**.
:::

## Prerequisites

Before you begin, ensure you have:

- [RainbowKit](https://rainbowkit.com/docs/installation) installed in your
  project
- Oko SDK packages

## Installation

First, install the required dependencies:

```bash
npm install @rainbow-me/rainbowkit @oko-wallet/oko-sdk-eth wagmi viem
```

## Step 1: Create Custom Oko Connector

### Import Required Dependencies

```typescript
import {
  connectorsForWallets,
  WalletDetailsParams,
  Wallet,
} from "@rainbow-me/rainbowkit";
import { createConfig, CreateConnectorFn, createConnector } from "wagmi";
import { getAddress, toHex } from "viem";
import {
  OkoEIP1193Provider,
  OkoEthWalletInterface,
  type OkoEthWalletInitArgs,
} from "@oko-wallet/oko-sdk-eth";

const okoIcon = "data:image/svg+xml;base64,..."; // Oko icon here

function okoConnector(
  walletDetails: WalletDetailsParams,
  args: OkoEthWalletInitArgs,
): CreateConnectorFn {
  let okoEth: OkoEthWalletInterface | null = null;
  let cachedProvider: OkoEIP1193Provider | null = null;

  async function initOkoEthOnce(): Promise<OkoEthWalletInterface> {
    if (okoEth) {
      return okoEth;
    }

    const { OkoEthWallet } = await import("@oko-wallet/oko-sdk-eth");
    const initRes = OkoEthWallet.init(args);

    if (!initRes.success) {
      throw new Error(`init fail: ${initRes.err}`);
    }

    await initRes.data.waitUntilInitialized;

    okoEth = initRes.data;

    return okoEth;
  }

  return createConnector<OkoEIP1193Provider>((config) => {
    const wallet = {
      id: "oko",
      name: "Oko",
      type: "oko" as const,
      icon: keplrIcon,
      setup: async () => {
        if (typeof window !== "undefined") {
          await initOkoEthOnce();
        }
      },
      connect: async (parameters?: {
        chainId?: number | undefined;
        isReconnecting?: boolean | undefined;
      }) => {
        if (!okoEth) {
          await initOkoEthOnce();

          throw new Error("oko sdk is just initialized");
        }

        let accounts = await wallet.getAccounts();

        if (accounts.length === 0) {
          if (parameters?.isReconnecting) {
            return {
              accounts,
              chainId: await wallet.getChainId(),
            };
          }
          await okoEth.okoWallet.signIn("google");
        }

        const chainId = await wallet.getChainId();
        accounts = await wallet.getAccounts();

        return {
          accounts,
          chainId,
        };
      },
      disconnect: async () => {
        const provider = await wallet.getProvider();
        provider.removeListener("accountsChanged", wallet.onAccountsChanged);
        provider.removeListener("chainChanged", wallet.onChainChanged);
        if (okoEth) {
          await okoEth.okoWallet.signOut();
        }
      },
      getAccounts: async () => {
        const provider = await wallet.getProvider();
        const accounts = await provider.request({
          method: "eth_accounts",
        });
        return accounts.map((x: string) => getAddress(x));
      },
      getChainId: async () => {
        const provider = await wallet.getProvider();
        const chainId = await provider.request({
          method: "eth_chainId",
        });
        return Number(chainId);
      },
      getProvider: async () => {
        if (cachedProvider) {
          return cachedProvider;
        }

        const okoEth = await initOkoEthOnce();

        cachedProvider = await okoEth.getEthereumProvider();

        cachedProvider.on("chainChanged", (chainId) => {
          wallet.onChainChanged(chainId);
        });

        cachedProvider.on("accountsChanged", (accounts) => {
          wallet.onAccountsChanged(accounts);
        });

        return cachedProvider;
      },
      isAuthorized: async () => {
        const accounts = await wallet.getAccounts();
        return accounts.length > 0;
      },
      switchChain: async ({ chainId }: { chainId: number }) => {
        const chain = config.chains.find((network) => network.id === chainId);
        if (!chain) {
          throw new Error(`Chain ${chainId} not found`);
        }

        const provider = await wallet.getProvider();
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHex(chainId) }],
        });

        return chain;
      },
      onAccountsChanged: (accounts: string[]) => {
        if (accounts.length === 0) {
          wallet.onDisconnect();
        } else {
          config.emitter.emit("change", {
            accounts: accounts.map((x: string) => getAddress(x)),
          });
        }
      },
      onChainChanged: (chainId: string | number) => {
        const chainIdNumber = Number(chainId);
        config.emitter.emit("change", { chainId: chainIdNumber });
      },
      onDisconnect: () => {
        config.emitter.emit("disconnect");
      },
      ...walletDetails,
    };

    return wallet;
  });
}
```

### Create Wallet Configuration Function

```typescript
function toOko(args: OkoEthWalletInitArgs): () => Wallet {
  return () => ({
    id: "oko",
    name: "Oko",
    iconUrl: okoIcon,
    shortName: "Oko",
    rdns: "oko.app",
    iconBackground: "#f2641d",
    installed: true,
    createConnector: (walletDetails) => okoConnector(walletDetails, args),
  });
}
```

## Step 2: Configure Wagmi with Keplr

### Create Wagmi Configuration

<!-- prettier-ignore -->
::::tip Supported chains
You can find the list of supported EVM chains in the Keplr Chain Registry on GitHub: [Keplr Chain Registry (EVM)](https://github.com/chainapsis/keplr-chain-registry/tree/main/evm).
::::

```typescript
// wagmiConfig.ts
import { createConfig } from "wagmi";
import { coinbaseWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { createClient, http } from "viem";
import { mainnet } from "viem/chains";

const oko = toOko({
  api_key: "YOUR_API_KEY",
  theme: "dark",
});

export const config = createConfig({
  chains: [mainnet],
  connectors: connectorsForWallets(
    [
      {
        groupName: "Recommended",
        wallets: [oko],
      },
      {
        groupName: "Other Wallets",
        wallets: [metaMaskWallet, coinbaseWallet],
      },
    ],
    {
      appName: "Your App Name",
      projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
    },
  ),
  client({ chain }) {
    return createClient({ chain, transport: http() });
  },
});
```

## Step 3: Setup Providers

### Create Provider Component

```typescript
// providers.ts
import React from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./wagmiConfig";

const queryClient = new QueryClient();

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
```

## Next Steps

- **[SDK Overview](./sdk-overview)** - Back to basics
- **[Cosmos Integration](./cosmos-integration)** - Cosmos patterns
- **[Ethereum Integration](./ethereum-integration)** - Ethereum patterns
- **[React Integration](./react-integration)** - React patterns
- **[Error Handling](./error-handling)** - Error handling patterns
