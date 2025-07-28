import {
  Chain,
  createClient,
  fallback,
  getAddress,
  hashMessage,
  hashTypedData,
  Hex,
  http,
  keccak256,
  parseSignature,
  serializeTransaction,
  toHex,
} from "viem";
import { hardhat, mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createConfig, CreateConnectorFn, createConnector } from "wagmi";
import {
  connectorsForWallets,
  WalletDetailsParams,
  Wallet,
} from "@rainbow-me/rainbowkit";
import { coinbaseWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { toPrivyWallet } from "@privy-io/cross-app-connect/rainbow-kit";
import { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";
import {
  type EIP1193Provider,
  EthEWallet,
  EthSigner,
  EthSignMethod,
  initEthEWallet,
  initEWalletEIP1193Provider,
  SignFunctionParams,
  SignFunctionResult,
} from "@keplr-ewallet/ewallet-sdk-eth";

import { getAlchemyHttpUrl } from "@keplr-ewallet-sandbox-evm/utils/scaffold-eth";
import { keplrIcon } from "@keplr-ewallet-sandbox-evm/assets/icon";
import scaffoldConfig, {
  DEFAULT_ALCHEMY_API_KEY,
  ScaffoldConfig,
} from "@keplr-ewallet-sandbox-evm/../scaffold.config";

const { targetNetworks } = scaffoldConfig;

export const defaultWallets = [
  metaMaskWallet,
  coinbaseWallet,
  toPrivyWallet({
    id: "cm04asygd041fmry9zmcyn5o5",
    name: "Abstract",
    iconUrl: "https://example.com/image.png",
  }),
];

export const enabledChains = targetNetworks.find(
  (network: Chain) => network.id === 1,
)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

export const createEthLocalSigner = (
  privateKey: Hex,
): EthSigner & { signHash: ({ hash }: { hash: Hex }) => Promise<Hex> } => {
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    sign: async function <M extends EthSignMethod>(
      parameters: SignFunctionParams<M>,
    ): Promise<SignFunctionResult<M>> {
      switch (parameters.type) {
        case "sign_transaction": {
          const { transaction } = parameters.data;
          const serializedTx = serializeTransaction(transaction);
          const hash = keccak256(serializedTx);
          const signature = await account.sign({ hash });
          const signedTransaction = serializeTransaction(
            transaction,
            parseSignature(signature),
          );
          return {
            type: "signed_transaction",
            signedTransaction,
          };
        }
        case "personal_sign": {
          const { message } = parameters.data;
          const hash = hashMessage(message);
          const signature = await account.sign({ hash });
          return {
            type: "signature",
            signature,
          };
        }
        case "sign_typedData_v4": {
          const { message } = parameters.data;
          const hash = hashTypedData(message);
          const signature = await account.sign({ hash });
          return {
            type: "signature",
            signature,
          };
        }
        default:
          throw new Error(`Unknown sign type: ${(parameters as any).type}`);
      }
    },
    signHash: async ({ hash }: { hash: Hex }): Promise<Hex> => {
      return await account.sign({ hash });
    },
  };
};

export interface WalletConnectOptions {
  projectId: string;
}

// TODO: move to ewallet/variants/rainbowkit or wagmi?
const keplrEWalletConnector = (
  walletDetails: WalletDetailsParams,
  eWallet: KeplrEWallet,
): CreateConnectorFn => {
  let provider: EIP1193Provider | null = null;

  const initProvider = async (
    chains: readonly [Chain, ...Chain[]],
  ): Promise<EIP1193Provider> => {
    // TODO:
    // 1. open connect modal/popup (with e-wallet app id, request origin, etc.)
    // 2. sign in with google
    // 3. return credentials from modal/popup to here

    const url = new URL("http://localhost:3201/connect");
    const params = new URLSearchParams({
      requestOrigin: window.location.origin,
      keplrEWalletAppId: "ewallet-connect-rainbowkit",
      connect: "true",
    });

    const target = "keplr-ewallet-connect";
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    // in mobile, new tab is opened with the url and the same process below is done.
    const popup = window.open(
      "about:blank",
      target,
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!popup) {
      throw new Error("Failed to open new window for e-wallet connect");
    }

    // register nonce to e-wallet
    try {
      const ack = await eWallet.sendMsgToIframe({
        msg_type: "set_oauth_nonce",
        payload: Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      });
      console.log("ack:", ack);
    } catch (e) {
      console.error("Failed to register nonce to e-wallet:", e);
      popup.close();
      throw e;
    }

    popup.location.href = `${url.toString()}?${params.toString()}`;

    // oauth2 signIn이 response_mode=web_message를 지원하면 팝업에서 더 안전하게 인증 결과를 받을 수 있다고 한다.
    function listenForResult(popup: Window): Promise<string> {
      return new Promise((resolve, reject) => {
        function handler(event: MessageEvent) {
          // 팝업 오리진에서 온 메시지만 처리
          if (event.origin !== url.origin) return;

          const data = event.data;

          if (data.type === "connect_ack") {
            window.removeEventListener("message", handler);
            // Cross-Origin-Opener-Policy policy would block the window.close call.
            popup.close();
            resolve(data.message);
          }
        }
        window.addEventListener("message", handler);

        // 팝업이 강제 종료되었을 때 타임아웃 처리
        const interval = setInterval(() => {
          if (popup.closed) {
            clearInterval(interval);
            reject(new Error("Window closed by user"));
          }
        }, 500);

        // 사용자가 5분 이상 팝업을 열어두면 타임아웃
        const timeout = setTimeout(
          () => {
            popup.close();
            reject(new Error("User unresponded to the window"));
          },
          5 * 60 * 1000,
        ); // 5 minutes

        return () => {
          clearTimeout(timeout);
        };
      });
    }

    const result = await listenForResult(popup);
    console.log("result:", result);

    // 테스트를 위한 random local account 추가
    if (result) {
      // generate random private key
      const privateKey = toHex(
        Buffer.from(crypto.getRandomValues(new Uint8Array(32))),
      );
      // local account from hardhat private key
      const signer = createEthLocalSigner(privateKey);

      console.log("signer:", signer);

      const chain = chains[0];

      console.log("chain:", chain);

      const provider = await initEWalletEIP1193Provider({
        id: "keplr-ewallet-connect-rainbowkit",
        chains: [
          {
            chainId: toHex(chain.id),
            chainName: chain.name,
            rpcUrls: chain.rpcUrls.default.http,
            nativeCurrency: chain.nativeCurrency,
            blockExplorerUrls: chain.blockExplorers?.default.url
              ? [chain.blockExplorers.default.url]
              : ["http://localhost:8545/blockexplorer"], // CHECK: block explorer url should be checked?
          },
        ],
        signer,
      });

      return provider;
    }

    // TODO: 팝업에서 받은 결과를 통해 provider 초기화
    throw new Error("Not implemented yet!");
  };

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
        console.log("getProvider");
        if (!provider) {
          provider = await initProvider(config.chains);

          console.log("provider:", provider);
        }

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
export const keplrEWallet = (eWallet: KeplrEWallet) => {
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

export const wagmiConfigWithKeplr = (connector?: () => Wallet) => {
  let wallets = [...defaultWallets];

  if (connector && typeof connector === "function") {
    wallets.unshift(connector);
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
        ...(chain.id !== (hardhat as Chain).id
          ? { pollingInterval: scaffoldConfig.pollingInterval }
          : {}),
      });
    },
  });
};
