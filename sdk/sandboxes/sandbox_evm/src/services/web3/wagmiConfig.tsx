import { Chain, createClient, fallback, getAddress, http, toHex } from "viem";
import { sepolia } from "viem/chains";
import { createConfig, CreateConnectorFn, createConnector } from "wagmi";
import {
  connectorsForWallets,
  WalletDetailsParams,
  Wallet,
} from "@rainbow-me/rainbowkit";
import { coinbaseWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { keplrWallet } from "@keplr-wallet/rainbow-connector";
import { toPrivyWallet } from "@privy-io/cross-app-connect/rainbow-kit";
import {
  type EIP1193Provider,
  EthEWallet,
} from "@keplr-ewallet/ewallet-sdk-eth";

import { getAlchemyHttpUrl } from "@keplr-ewallet-sandbox-evm/utils/scaffold-eth";
import { keplrIcon } from "@keplr-ewallet-sandbox-evm/assets/icon";
import scaffoldConfig, {
  DEFAULT_ALCHEMY_API_KEY,
  ScaffoldConfig,
} from "@keplr-ewallet-sandbox-evm/../scaffold.config";
import { useAppState } from "@keplr-ewallet-sandbox-evm/services/store/app";

const { targetNetworks } = scaffoldConfig;

export const defaultWallets = [
  keplrWallet,
  metaMaskWallet,
  coinbaseWallet,
  toPrivyWallet({
    id: "cm04asygd041fmry9zmcyn5o5",
    name: "Abstract",
    iconUrl: "https://example.com/image.png",
  }),
];

export const enabledChains = targetNetworks.find(
  (network: Chain) => network.id === 11155111,
)
  ? targetNetworks
  : ([...targetNetworks, sepolia] as const);

export interface WalletConnectOptions {
  projectId: string;
}

// TODO: move to ewallet/variants/rainbowkit or wagmi?
const keplrEWalletConnector = (
  walletDetails: WalletDetailsParams,
  ethEWallet: EthEWallet,
): CreateConnectorFn => {
  let provider: EIP1193Provider | null = null;

  return createConnector((config) => {
    console.log("keplr e-wallet connector init with chains:", config.chains);

    const wallet = {
      id: "keplr-ewallet",
      name: "Keplr E-Wallet",
      type: "keplr-ewallet" as const,
      icon: keplrIcon,
      connect: async () => {
        console.log("connect keplr e-wallet!");

        const providerInstance = await wallet.getProvider();
        const accounts = await providerInstance.request({
          method: "eth_requestAccounts",
        });
        const chainId = await providerInstance.request({
          method: "eth_chainId",
        });

        // if provider is first time initialized,
        // add listener for accountsChanged and chainChanged

        return {
          accounts: accounts.map((x: string) => getAddress(x)),
          chainId: Number(chainId),
        };

        // return {
        //   accounts: [],
        //   chainId: 0,
        // };
      },
      disconnect: async () => {
        const providerInstance = await wallet.getProvider();
        providerInstance.removeListener(
          "accountsChanged",
          wallet.onAccountsChanged,
        );
        providerInstance.removeListener("chainChanged", wallet.onChainChanged);
      },
      getAccounts: async () => {
        console.log("getAccounts");
        const providerInstance = await wallet.getProvider();
        return await providerInstance.request({
          method: "eth_accounts",
        });
      },
      getChainId: async () => {
        console.log("getChainId");
        const providerInstance = await wallet.getProvider();
        const chainId = await providerInstance.request({
          method: "eth_chainId",
        });
        return Number(chainId);

        // TODO: provider 초기화가 안돼서 값이 반환되지 않으면
        // chainId를 먼저 체크하고 provider 초기화 처리를 해야 하므로, 우선 0을 반환함
        // return 0;
      },
      getProvider: async (): Promise<EIP1193Provider> => {
        if (provider) {
          return provider;
        }

        await ethEWallet.eWallet.signIn("google");
        provider = await ethEWallet.getEthereumProvider();

        return provider;
      },
      isAuthorized: async () => {
        try {
          const accounts = await wallet.getAccounts();
          return !!accounts && accounts.length > 0;
        } catch (_) {
          return false;
        }
      },
      switchChain: async ({ chainId }: { chainId: number }) => {
        const chain = targetNetworks.find((network) => network.id === chainId);
        if (!chain) {
          throw new Error(`Chain ${chainId} not found`);
        }

        const providerInstance = await wallet.getProvider();
        await providerInstance.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHex(chainId) }],
        });

        wallet.onChainChanged(chainId);

        return chain;
      },
      onAccountsChanged: (accounts: string[]) => {
        if (accounts.length === 0) wallet.onDisconnect();
        else
          config.emitter.emit("change", {
            accounts: accounts.map((x: string) => getAddress(x)),
          });
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
};

// TODO: move to ewallet/variants/rainbowkit or wagmi?
export const keplrEWallet = (eWallet: EthEWallet) => {
  return (): Wallet => ({
    id: "keplr-ewallet",
    name: "Keplr E-Wallet",
    iconUrl: keplrIcon,
    shortName: "Keplr",
    rdns: "keplr-ewallet.com",
    iconBackground: "#0c2f78",
    downloadUrls: {
      android:
        "https://play.google.com/store/apps/details?id=com.chainapsis.keplr&pcampaignid=web_share",
      chrome:
        "https://chromewebstore.google.com/detail/dmkamcknogkgcdfhhbddcghachkejeap?utm_source=item-share-cb",
    },
    installed: true,
    createConnector: (walletDetails) =>
      keplrEWalletConnector(walletDetails, eWallet),
  });
};

export const wagmiConfigWithKeplr = () => {
  let wallets = [...defaultWallets];

  const ethEWallet = useAppState((state) => state.keplr_sdk_eth);

  if (ethEWallet) {
    wallets.unshift(keplrEWallet(ethEWallet));
  }

  return createConfig({
    chains: enabledChains,
    ssr: true,
    connectors: connectorsForWallets(
      [
        {
          groupName: "Supported Wallets",
          wallets,
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
};
