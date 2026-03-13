"use client";

import type {
  OkoEIP1193Provider,
  OkoEthWalletInitArgs,
  OkoEthWalletInterface,
} from "@oko-wallet/oko-sdk-eth";
import {
  connectorsForWallets,
  type Wallet,
  type WalletDetailsParams,
} from "@rainbow-me/rainbowkit";
import {
  type AddEthereumChainParameter,
  createClient,
  type ExactPartial,
  fallback,
  getAddress,
  http,
  toHex,
} from "viem";
import { type CreateConnectorFn, createConfig, createConnector } from "wagmi";

import scaffoldConfig, {
  DEFAULT_ALCHEMY_API_KEY,
  type ScaffoldConfig,
} from "@oko-wallet-sandbox-evm/../scaffold.config";
import { keplrIcon } from "@oko-wallet-sandbox-evm/assets/icon";
import { getAlchemyHttpUrl } from "@oko-wallet-sandbox-evm/utils/scaffold-eth";

const { targetNetworks } = scaffoldConfig;

export const defaultWallets = [
  toOko({
    api_key: "72bd2afd04374f86d563a40b814b7098e5ad6c7f52d3b8f84ab0c3d05f73ac6c",
    sdk_endpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT,
  }),
];

function toOko(args: OkoEthWalletInitArgs): () => Wallet {
  return () => ({
    id: "oko",
    name: "Oko",
    iconUrl: keplrIcon,
    shortName: "Oko",
    rdns: "oko.app",
    iconBackground: "#0c2f78",
    installed: true,
    createConnector: (walletDetails) => okoConnector(walletDetails, args),
  });
}

export interface WalletConnectOptions {
  projectId: string;
}

// wagmi compatible connector for oko
function okoConnector(
  walletDetails: WalletDetailsParams,
  args: OkoEthWalletInitArgs,
): CreateConnectorFn {
  let okoEthWallet: OkoEthWalletInterface | null = null;
  let cachedProvider: OkoEIP1193Provider | null = null;

  async function initOkoEthWalletOnce(): Promise<OkoEthWalletInterface> {
    if (okoEthWallet) {
      return okoEthWallet;
    }

    // lazy import to avoid SSR issues and optimize bundle size
    const { OkoEthWallet } = await import("@oko-wallet/oko-sdk-eth");
    const initRes = OkoEthWallet.init(args);

    if (!initRes.success) {
      throw new Error(`init fail: ${initRes.err}`);
    }

    await initRes.data.waitUntilInitialized;

    okoEthWallet = initRes.data;
    return okoEthWallet;
  }

  return createConnector<OkoEIP1193Provider>((config) => {
    const wallet = {
      id: "oko",
      name: "Oko",
      type: "oko" as const,
      icon: keplrIcon,
      setup: async () => {
        console.log("[sandbox-evm] setup oko");
        // Only setup in browser environment
        if (typeof window !== "undefined") {
          console.log("[sandbox-evm] setup oko in browser");
          await initOkoEthWalletOnce();
        } else {
          console.log("[sandbox-evm] oko can only be initialized in browser");
        }
      },
      connect: async (parameters?: {
        chainId?: number | undefined;
        isReconnecting?: boolean | undefined;
      }) => {
        console.log("[sandbox-evm] try to connect oko!");

        if (!okoEthWallet) {
          await initOkoEthWalletOnce();

          // DO NOT fallthrough here to manually retry connect
          // as popup on safari will be blocked by async initialization
          throw new Error("oko just initialized");
        }

        // cached accounts retrieved from provider
        let accounts = await wallet.getAccounts();

        // if accounts is empty, try sign in
        if (accounts.length === 0) {
          // if is reconnecting, skip sign in with google
          // only trigger by user manually interact with the connector
          if (parameters?.isReconnecting) {
            console.log(
              "[sandbox-evm] reconnecting oko, skip sign in with google",
            );
            return {
              accounts,
              chainId: await wallet.getChainId(),
            };
          }

          // popup on safari works fine here as we use cached states
          console.log(
            "[sandbox-evm] no authenticated account, opening connect modal",
          );
          await okoEthWallet.okoWallet.openSignInModal();
        }

        const chainId = await wallet.getChainId();

        // TODO: after enable to override chain info
        // if (parameters?.chainId && chainId !== parameters.chainId) {
        //   await wallet.switchChain({ chainId: parameters.chainId });
        // }

        // re-request accounts, there should be at least one account after sign in
        accounts = await wallet.getAccounts();

        console.log(
          "[sandbox-evm] connected with accounts ",
          accounts.length > 0,
        );

        return {
          accounts,
          chainId,
        };
      },
      disconnect: async () => {
        console.log("[sandbox-evm] disconnect oko");
        const provider = await wallet.getProvider();
        provider.removeListener("accountsChanged", wallet.onAccountsChanged);
        provider.removeListener("chainChanged", wallet.onChainChanged);
        if (okoEthWallet) {
          await okoEthWallet.okoWallet.signOut();
        }
      },
      getAccounts: async () => {
        console.log("[sandbox-evm] handle `getAccounts`");
        const provider = await wallet.getProvider();
        const accounts = await provider.request({
          method: "eth_accounts",
        });
        return accounts.map((x: string) => getAddress(x));
      },
      getChainId: async () => {
        console.log("[sandbox-evm] handle `getChainId`");

        const provider = await wallet.getProvider();
        const chainId = await provider.request({
          method: "eth_chainId",
        });
        return Number(chainId);
      },
      getProvider: async () => {
        console.log("[sandbox-evm] handle `getProvider`");
        if (cachedProvider) {
          return cachedProvider;
        }

        const okoEthWallet = await initOkoEthWalletOnce();

        cachedProvider = await okoEthWallet.getEthereumProvider();

        cachedProvider.on("chainChanged", (chainId) => {
          wallet.onChainChanged(chainId);
        });

        cachedProvider.on("accountsChanged", (accounts) => {
          wallet.onAccountsChanged(accounts);
        });

        return cachedProvider;
      },
      isAuthorized: async () => {
        console.log("[sandbox-evm] handle `isAuthorized`");
        const accounts = await wallet.getAccounts();
        return accounts.length > 0;
      },
      switchChain: async (parameters: {
        addEthereumChainParameter?:
          | ExactPartial<Omit<AddEthereumChainParameter, "chainId">>
          | undefined;
        chainId: number;
      }) => {
        const { chainId, addEthereumChainParameter } = parameters;
        console.log("[sandbox-evm] handle `switchChain`", chainId);
        const chain = config.chains.find((network) => network.id === chainId);
        if (!chain) {
          throw new Error(`Chain ${chainId} not found`);
        }

        const provider = await wallet.getProvider();

        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: toHex(chainId) }],
          });
        } catch {
          if (addEthereumChainParameter) {
            console.log(
              "[sandbox-evm] add ethereum chain",
              addEthereumChainParameter,
            );

            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  ...addEthereumChainParameter,
                  chainId: toHex(chainId),
                  chainName: addEthereumChainParameter.chainName ?? "",
                  rpcUrls: addEthereumChainParameter.rpcUrls ?? [],
                },
              ],
            });

            // switch to the new chain
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: toHex(chainId) }],
            });
          } else {
            console.log("[sandbox-evm] add ethereum chain", chain);
            const rpcChain: AddEthereumChainParameter = {
              chainId: toHex(chainId),
              chainName: chain.name,
              rpcUrls: chain.rpcUrls.default.http,
              blockExplorerUrls: chain.blockExplorers?.default.url
                ? [chain.blockExplorers.default.url]
                : [],
              nativeCurrency: chain.nativeCurrency,
            };

            await provider.request({
              method: "wallet_addEthereumChain",
              params: [rpcChain],
            });

            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: toHex(chainId) }],
            });
          }
        }

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

export const wagmiConfig = createConfig({
  chains: [targetNetworks[0], ...targetNetworks.slice(1)],
  ssr: true, // in server side, it won't be able to initialize oko
  connectors: connectorsForWallets(
    [
      {
        groupName: "Supported Wallets",
        wallets: defaultWallets,
      },
    ],
    {
      appName: "Sandbox EVM",
      projectId: scaffoldConfig.walletConnectProjectId,
    },
  ),
  client: ({ chain }) => {
    let rpcFallbacks = [http()];
    const rpcOverrideUrl = (
      scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"]
    )?.[chain.id];
    if (rpcOverrideUrl) {
      rpcFallbacks = [http(rpcOverrideUrl), http()];
    } else {
      const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
      if (alchemyHttpUrl) {
        const isUsingDefaultKey =
          scaffoldConfig.alchemyApiKey === DEFAULT_ALCHEMY_API_KEY;
        rpcFallbacks = isUsingDefaultKey
          ? [http(), http(alchemyHttpUrl)]
          : [http(alchemyHttpUrl), http()];
      }
    }
    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      ...{ pollingInterval: scaffoldConfig.pollingInterval },
    });
  },
});
